import Link from "next/link";
import { repos } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const pageSize = 50;

  const { items, total } = await repos.productsRepo.listProductsAdmin({ page, pageSize });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h1 className="text-2xl font-bold">Products</h1>
      <p className="mt-2 text-sm text-slate-600">
        {total} products
        {totalPages > 1 ? ` — page ${page} of ${totalPages}` : ""}
      </p>
      <ul className="mt-6 space-y-2 text-sm">
        {items.map((p) => (
          <li key={p.id} className="rounded border bg-white px-4 py-2">
            {p.sku} — {p.name}{" "}
            <span className="text-slate-500">
              (stock: {p.inventory?.quantityOnHand ?? 0})
            </span>
          </li>
        ))}
      </ul>
      {totalPages > 1 && (
        <div className="mt-6 flex gap-2 text-sm">
          {page > 1 && (
            <Link
              href={`/admin/products?page=${page - 1}`}
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
              href={`/admin/products?page=${page + 1}`}
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
