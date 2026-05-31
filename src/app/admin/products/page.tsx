import { repos } from "@/lib/db";

export default async function AdminProductsPage() {
  const products = await repos.productsRepo.listProductsAdmin();

  return (
    <div>
      <h1 className="text-2xl font-bold">Products</h1>
      <p className="mt-2 text-sm text-slate-600">{products.length} products</p>
      <ul className="mt-6 space-y-2 text-sm">
        {products.map((p) => (
          <li key={p.id} className="rounded border bg-white px-4 py-2">
            {p.sku} — {p.name}{" "}
            <span className="text-slate-500">
              (stock: {p.inventory?.quantityOnHand ?? 0})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
