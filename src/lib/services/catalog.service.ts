import { repos } from "@/lib/db";
import type { ProductDetail } from "@/lib/db/types";
import type { PublicProduct } from "@/types";

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
  return repos.categoriesRepo.buildCategoryTree();
}

export async function listRootCategories() {
  return repos.categoriesRepo.listRootCategories();
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

  let categorySubtreeId: string | undefined;
  if (params.category) {
    const cat = await repos.categoriesRepo.findCategoryBySlug(params.category);
    if (!cat) {
      return { items: [], total: 0, page, pageSize };
    }
    categorySubtreeId = cat.id;
  }

  const { items, total } = await repos.productsRepo.listProducts({
    vertical: params.vertical ?? null,
    categorySubtreeId,
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

export async function listProductsForCategoryAdmin(params: {
  categorySlug: string;
  page?: number;
  pageSize?: number;
  activeOnly?: boolean;
}) {
  const cat = await repos.categoriesRepo.findCategoryBySlug(params.categorySlug);
  if (!cat) return { items: [], total: 0, page: params.page ?? 1, pageSize: params.pageSize ?? 48 };
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 48;
  const { items, total } = await repos.productsRepo.listProducts({
    categorySubtreeId: cat.id,
    page,
    pageSize,
    activeOnly: params.activeOnly,
  });
  return { items, total, page, pageSize, category: cat };
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
