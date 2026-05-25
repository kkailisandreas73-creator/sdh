import { prisma } from "@/lib/db";
import { mapProduct, productInclude } from "@/lib/services/catalog.service";
import type { PricedProduct, PublicProduct } from "@/types";

export async function resolveUnitPrice(
  productId: string,
  quantity: number,
  accountId?: string | null
): Promise<{ unitPrice: number; tiers: { minQty: number; unitPrice: number }[] }> {
  if (accountId) {
    const override = await prisma.accountPriceOverride.findFirst({
      where: {
        accountId,
        productId,
        OR: [{ validTo: null }, { validTo: { gte: new Date() } }],
      },
      orderBy: { validFrom: "desc" },
    });
    if (override) {
      return { unitPrice: override.unitPrice, tiers: [{ minQty: 1, unitPrice: override.unitPrice }] };
    }
  }

  const priceList = await prisma.priceList.findFirst({
    where: { isDefault: true },
  });
  if (!priceList) return { unitPrice: 0, tiers: [] };

  const tiers = await prisma.priceTier.findMany({
    where: { priceListId: priceList.id, productId },
    orderBy: { minQty: "asc" },
  });

  if (tiers.length === 0) return { unitPrice: 0, tiers: [] };

  const applicable = [...tiers].reverse().find((t) => quantity >= t.minQty) ?? tiers[0];
  return {
    unitPrice: applicable.unitPrice,
    tiers: tiers.map((t) => ({ minQty: t.minQty, unitPrice: t.unitPrice })),
  };
}

export async function priceProduct(
  product: PublicProduct,
  quantity: number,
  accountId?: string | null
): Promise<PricedProduct> {
  const { unitPrice, tiers } = await resolveUnitPrice(product.id, quantity, accountId);
  const available = product.inStock;
  const canInstantCheckout =
    product.allowInstantCheckout &&
    !product.quoteOnly &&
    available;

  return {
    ...product,
    unitPrice,
    tiers,
    canInstantCheckout,
  };
}

export async function getPricedProductBySlug(
  slug: string,
  accountId?: string | null,
  quantity = 1
): Promise<PricedProduct | null> {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    include: productInclude,
  });
  if (!product) return null;
  const publicProduct = mapProduct(product);
  return priceProduct(publicProduct, quantity, accountId);
}

export async function listPricedProducts(
  params: Parameters<typeof import("@/lib/services/catalog.service").listProductsPublic>[0],
  accountId?: string | null
) {
  const { listProductsPublic } = await import("@/lib/services/catalog.service");
  const result = await listProductsPublic(params);
  const items = await Promise.all(
    result.items.map((p) => priceProduct(p, 1, accountId))
  );
  return { ...result, items };
}
