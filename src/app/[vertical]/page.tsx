import { notFound } from "next/navigation";
import { listProductsPublic } from "@/lib/services/catalog.service";
import { listPricedProducts } from "@/lib/services/pricing.service";
import { getSessionUser, isActiveBuyer } from "@/lib/auth/session";
import { verticalFromSlug } from "@/lib/utils";
import { ProductCard } from "@/components/catalog/ProductCard";
import { repos } from "@/lib/db";

export default async function VerticalPage({
  params,
}: {
  params: Promise<{ vertical: string }>;
}) {
  const { vertical: verticalSlug } = await params;
  const vertical = verticalFromSlug(verticalSlug);
  if (!vertical) notFound();

  const user = await getSessionUser();
  const showPrice = !!(user && isActiveBuyer(user) && user.accountId);

  const result = showPrice
    ? await listPricedProducts({ vertical: verticalSlug, pageSize: 48 }, user!.accountId!)
    : await listProductsPublic({ vertical: verticalSlug, pageSize: 48 });

  const title =
    verticalSlug.charAt(0).toUpperCase() + verticalSlug.slice(1);

  const subcategories = await repos.categoriesRepo.listSubcategoriesByVertical(
    vertical
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">
        {result.total} products
        {!showPrice && " — sign in to see wholesale pricing"}
      </p>

      {subcategories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {subcategories.map((c) => (
            <a
              key={c.id}
              href={`/${verticalSlug}?category=${c.slug}`}
              className="rounded-full border bg-white px-3 py-1 text-sm hover:border-[#c41e3a]"
            >
              {c.name}
            </a>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {result.items.map((product) => (
          <ProductCard key={product.id} product={product} showPrice={showPrice} />
        ))}
      </div>
    </div>
  );
}
