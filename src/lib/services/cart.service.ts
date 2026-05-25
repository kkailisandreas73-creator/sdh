import { prisma } from "@/lib/db";
import { priceProduct } from "@/lib/services/pricing.service";
import { mapProduct, productInclude } from "@/lib/services/catalog.service";
import type { CartLineView } from "@/types";
import { getLineEligibility } from "@/lib/services/checkout.service";

export async function getOrCreateCart(userId: string) {
  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId } });
  }
  return cart;
}

export async function getCartView(
  userId: string,
  accountId: string | null
): Promise<{ items: CartLineView[]; subtotal: number }> {
  const cart = await getOrCreateCart(userId);
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: { include: productInclude } },
  });

  const lines: CartLineView[] = [];
  let subtotal = 0;

  for (const item of items) {
    const publicProduct = mapProduct(item.product);
    const priced = await priceProduct(publicProduct, item.quantity, accountId);
    const lineTotal = priced.unitPrice * item.quantity;
    subtotal += lineTotal;
    const eligibility = await getLineEligibility(item.productId, item.quantity);
    lines.push({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      product: priced,
      lineTotal,
      eligibility,
    });
  }

  return { items: lines, subtotal };
}

export async function addToCart(userId: string, productId: string, quantity: number) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  if (quantity < product.moq) {
    throw new Error(`MOQ is ${product.moq}`);
  }
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    update: { quantity },
    create: { cartId: cart.id, productId, quantity },
  });
  await prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
}

export async function updateCartItem(
  userId: string,
  itemId: string,
  quantity: number
) {
  const cart = await getOrCreateCart(userId);
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    include: { product: true },
  });
  if (!item) throw new Error("NOT_FOUND");
  if (quantity < item.product.moq) throw new Error(`MOQ is ${item.product.moq}`);
  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }
}

export async function removeCartItem(userId: string, itemId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
}

export async function clearCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}
