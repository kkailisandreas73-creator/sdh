import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";
import type { PublicProduct } from "@/types";
import { verticalFromSlug } from "@/lib/utils";

function mapProduct(
  product: Awaited<ReturnType<typeof fetchProductInclude>>
): PublicProduct {
  const available =
    (product.inventory?.quantityOnHand ?? 0) -
    (product.inventory?.reserved ?? 0);
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    description: product.description,
    brand: product.brand,
    moq: product.moq,
    category: {
      slug: product.category.slug,
      name: product.category.name,
      vertical: product.category.vertical,
    },
    images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
    inStock: available > 0,
    allowInstantCheckout: product.allowInstantCheckout,
    quoteOnly: product.quoteOnly,
  };
}

const productInclude = {
  category: true,
  images: { orderBy: { sortOrder: "asc" as const } },
  inventory: true,
};

async function fetchProductInclude(where: { id?: string; slug?: string }) {
  return prisma.product.findFirstOrThrow({
    where: { ...where, isActive: true },
    include: productInclude,
  });
}

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { children: { orderBy: { name: "asc" } } },
    where: { parentId: null },
  });
}

export async function listProductsPublic(params: {
  vertical?: string;
  category?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: PublicProduct[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 24;
  const skip = (page - 1) * pageSize;

  const vertical = params.vertical ? verticalFromSlug(params.vertical) : null;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(vertical
      ? { category: { vertical } }
      : {}),
    ...(params.category
      ? { category: { slug: params.category } }
      : {}),
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q } },
            { sku: { contains: params.q } },
            { tags: { contains: params.q.toLowerCase() } },
            { brand: { contains: params.q } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: products.map(mapProduct),
    total,
    page,
    pageSize,
  };
}

export async function getProductBySlugPublic(
  slug: string
): Promise<PublicProduct | null> {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    include: productInclude,
  });
  if (!product) return null;
  return mapProduct(product);
}

export { mapProduct, productInclude };
