import { listProductsPublic } from "@/lib/services/catalog.service";
import { listPricedProducts } from "@/lib/services/pricing.service";
import { getSessionUser, isActiveBuyer } from "@/lib/auth/session";
import { ProductCard } from "@/components/catalog/ProductCard";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const user = await getSessionUser();
  const showPrice = !!(user && isActiveBuyer(user) && user.accountId);

  const result =
    q && showPrice
      ? await listPricedProducts({ q, pageSize: 48 }, user!.accountId!)
      : q
        ? await listProductsPublic({ q, pageSize: 48 })
        : { items: [], total: 0, page: 1, pageSize: 48 };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-2xl font-bold">Search</h1>
      <form className="mt-4 flex gap-2" action="/search" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search products, SKU, brand…"
          className="flex-1 rounded border px-4 py-2"
        />
        <button type="submit" className="rounded-md bg-[#1e3a5f] px-6 py-2 text-white">
          Search
        </button>
      </form>
      {q && (
        <p className="mt-4 text-slate-600">
          {result.total} results for &quot;{q}&quot;
        </p>
      )}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {result.items.map((product) => (
          <ProductCard key={product.id} product={product} showPrice={showPrice} />
        ))}
      </div>
    </div>
  );
}
