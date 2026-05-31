import { repos } from "@/lib/db";
import type { ProductDetail } from "@/lib/db/types";
import type { PublicProduct } from "@/types";
import { verticalFromSlug } from "@/lib/utils";

export function mapProduct(product: ProductDetail): PublicProduct {
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

export async function listCategories() {
  return repos.categoriesRepo.listRootCategoriesWithChildren();
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
  const vertical = params.vertical ? verticalFromSlug(params.vertical) : null;
  const { items, total } = await repos.productsRepo.listProducts({
    vertical,
    categorySlug: params.category,
    q: params.q,
    page,
    pageSize,
    activeOnly: true,
  });
  return {
    items: items.map(mapProduct),
    total,
    page,
    pageSize,
  };
}

export async function getProductBySlugPublic(
  slug: string
): Promise<PublicProduct | null> {
  const product = await repos.productsRepo.findProductDetail({
    slug,
    activeOnly: true,
  });
  if (!product) return null;
  return mapProduct(product);
}

export { mapProduct as mapProductFromDetail };
