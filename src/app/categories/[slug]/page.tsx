import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/catalog/ProductCard";
import { getSessionUser, isActiveBuyer } from "@/lib/auth/session";
import { repos } from "@/lib/db";
import { listProductsPublic } from "@/lib/services/catalog.service";
import { listPricedProducts } from "@/lib/services/pricing.service";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const category = await repos.categoriesRepo.findCategoryBySlug(slug);
  if (!category) notFound();

  const [breadcrumb, children] = await Promise.all([
    repos.categoriesRepo.getCategoryBreadcrumb(slug),
    repos.categoriesRepo.listChildren(category.id),
  ]);

  const user = await getSessionUser();
  const showPrice = !!(user && isActiveBuyer(user) && user.accountId);

  const listParams = { category: slug, page, pageSize: 48 };
  const result = showPrice
    ? await listPricedProducts(listParams, user!.accountId!)
    : await listProductsPublic(listParams);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="text-sm text-slate-500">
        <Link href="/" className="hover:text-[#c41e3a]">
          Home
        </Link>
        {breadcrumb.map((c, i) => (
          <span key={c.id}>
            {" / "}
            {i === breadcrumb.length - 1 ? (
              <span className="text-slate-800">{c.name}</span>
            ) : (
              <Link href={`/categories/${c.slug}`} className="hover:text-[#c41e3a]">
                {c.name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <h1 className="mt-4 text-3xl font-bold text-slate-900">{category.name}</h1>
      <p className="mt-2 text-slate-600">
        {result.total} products
        {!showPrice && " — sign in to see wholesale pricing"}
      </p>

      {children.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-800">Subcategories</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/categories/${child.slug}`}
                className="rounded-lg border bg-white p-4 shadow-sm transition hover:border-[#c41e3a] hover:shadow"
              >
                <p className="font-medium text-slate-900">{child.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={children.length > 0 ? "mt-10" : "mt-8"}>
        <h2 className="text-lg font-semibold text-slate-800">Products</h2>
        {result.items.length === 0 ? (
          <p className="mt-4 text-slate-500">No products in this category yet.</p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.items.map((product) => (
              <ProductCard key={product.id} product={product} showPrice={showPrice} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/categories/${slug}?page=${page - 1}`}
                className="rounded border px-3 py-1 text-sm hover:bg-slate-50"
              >
                Previous
              </Link>
            )}
            <span className="px-3 py-1 text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/categories/${slug}?page=${page + 1}`}
                className="rounded border px-3 py-1 text-sm hover:bg-slate-50"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
