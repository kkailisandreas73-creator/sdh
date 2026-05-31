import { repos } from "@/lib/db";
import { mapProduct } from "@/lib/services/catalog.service";
import { priceProduct } from "@/lib/services/pricing.service";
import type { CartLineView } from "@/types";
import { getLineEligibility } from "@/lib/services/checkout.service";

export async function getOrCreateCart(userId: string) {
  let cart = await repos.cartRepo.findCartByUserId(userId);
  if (!cart) {
    cart = await repos.cartRepo.createCart(userId);
  }
  return cart;
}

export async function getCartView(
  userId: string,
  accountId: string | null
): Promise<{ items: CartLineView[]; subtotal: number }> {
  const cart = await getOrCreateCart(userId);
  const items = await repos.cartRepo.listCartItemsWithProducts(cart.id);

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
  const product = await repos.productsRepo.findProductById(productId);
  if (!product) throw new Error("NOT_FOUND");
  if (quantity < product.moq) {
    throw new Error(`MOQ is ${product.moq}`);
  }
  const cart = await getOrCreateCart(userId);
  await repos.cartRepo.upsertCartItem(cart.id, productId, quantity);
}

export async function updateCartItem(
  userId: string,
  itemId: string,
  quantity: number
) {
  const cart = await getOrCreateCart(userId);
  const item = await repos.cartRepo.findCartItem(cart.id, itemId);
  if (!item) throw new Error("NOT_FOUND");
  const product = await repos.productsRepo.findProductById(item.productId);
  if (!product) throw new Error("NOT_FOUND");
  if (quantity < product.moq) throw new Error(`MOQ is ${product.moq}`);
  if (quantity <= 0) {
    await repos.cartRepo.deleteCartItem(itemId);
  } else {
    await repos.cartRepo.updateCartItemQuantity(itemId, quantity);
  }
}

export async function removeCartItem(userId: string, itemId: string) {
  const cart = await getOrCreateCart(userId);
  await repos.cartRepo.deleteCartItemScoped(cart.id, itemId);
}

export async function clearCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  await repos.cartRepo.deleteCartItemsByCart(cart.id);
}
