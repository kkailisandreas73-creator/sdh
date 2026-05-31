import Link from "next/link";
import { notFound } from "next/navigation";
import { repos } from "@/lib/db";
import { listProductsForCategoryAdmin } from "@/lib/services/catalog.service";

export const dynamic = "force-dynamic";

export default async function AdminCategoryProductsPage({
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

  const [breadcrumb, children, productResult] = await Promise.all([
    repos.categoriesRepo.getCategoryBreadcrumb(slug),
    repos.categoriesRepo.listChildren(category.id),
    listProductsForCategoryAdmin({ categorySlug: slug, page, pageSize: 50 }),
  ]);

  const totalPages = Math.max(1, Math.ceil(productResult.total / productResult.pageSize));

  return (
    <div>
      <nav className="text-sm text-slate-500">
        <Link href="/admin/categories" className="hover:text-[#c41e3a]">
          Categories
        </Link>
        {breadcrumb.map((c, i) => (
          <span key={c.id}>
            {" / "}
            {i === breadcrumb.length - 1 ? (
              <span className="text-slate-800">{c.name}</span>
            ) : (
              <Link
                href={`/admin/categories/${c.slug}`}
                className="hover:text-[#c41e3a]"
              >
                {c.name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <h1 className="mt-4 text-2xl font-bold">{category.name}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {productResult.total} products in this category and subcategories
      </p>

      {children.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase text-slate-500">Subcategories</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {children.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/categories/${c.slug}`}
                  className="rounded-full border bg-white px-3 py-1 text-sm hover:border-[#c41e3a]"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold">Products</h2>
      <ul className="mt-4 space-y-2 text-sm">
        {productResult.items.map((p) => (
          <li key={p.id} className="rounded border bg-white px-4 py-2">
            <span className="font-mono text-slate-500">{p.sku}</span> — {p.name}
            <span className="text-slate-500">
              {" "}
              (stock: {p.inventory?.quantityOnHand ?? 0})
            </span>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="mt-6 flex gap-2 text-sm">
          {page > 1 && (
            <Link
              href={`/admin/categories/${slug}?page=${page - 1}`}
              className="rounded border px-3 py-1 hover:bg-slate-50"
            >
              Previous
            </Link>
          )}
          <span className="py-1 text-slate-600">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/categories/${slug}?page=${page + 1}`}
              className="rounded border px-3 py-1 hover:bg-slate-50"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
