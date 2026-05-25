import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: { category: true, inventory: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Products</h1>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">SKU</th>
            <th>Name</th>
            <th>Stock</th>
            <th>Flags</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-2 font-mono">{p.sku}</td>
              <td>
                <Link href={`/products/${p.slug}`} className="text-[#1e3a5f] hover:underline">
                  {p.name}
                </Link>
              </td>
              <td>{p.inventory?.quantityOnHand ?? 0}</td>
              <td className="text-xs">
                {p.quoteOnly ? "Quote only" : p.allowInstantCheckout ? "Instant" : "—"}
              </td>
              <td>{p.isActive ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
