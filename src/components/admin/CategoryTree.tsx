import Link from "next/link";
import type { CategoryAdminRow } from "@/lib/db/types";

export async function CategoryTree({ rows }: { rows: CategoryAdminRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No categories yet. Run an import from Admin → Import.
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-white">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex items-center gap-3 border-b py-2 text-sm"
          style={{ paddingLeft: `${row.depth * 1.25 + 0.5}rem` }}
        >
          <Link
            href={`/admin/categories/${row.slug}`}
            className="font-medium text-[#1e3a5f] hover:underline"
          >
            {row.name}
          </Link>
          <span className="text-slate-400">{row.slug}</span>
          <span className="ml-auto text-slate-500">{row.productCount} products</span>
        </div>
      ))}
    </div>
  );
}
