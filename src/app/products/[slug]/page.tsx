import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlugPublic } from "@/lib/services/catalog.service";
import { getPricedProductBySlug } from "@/lib/services/pricing.service";
import { getSessionUser, isActiveBuyer } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/utils";
import { AddToCartButton } from "@/components/catalog/AddToCartButton";
import type { PricedProduct } from "@/types";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getSessionUser();
  const canBuy = user && isActiveBuyer(user) && user.accountId;

  const product = canBuy
    ? await getPricedProductBySlug(slug, user.accountId)
    : await getProductBySlugPublic(slug);

  if (!product) notFound();

  const image = product.images[0]?.url;
  const pricedProduct =
    canBuy && "unitPrice" in product ? (product as PricedProduct) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border bg-white">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={product.name} className="w-full object-cover" />
          ) : (
            <div className="flex h-80 items-center justify-center text-slate-400">
              No image
            </div>
          )}
        </div>
        <div>
          <p className="text-sm text-slate-500">{product.sku}</p>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          {product.brand && (
            <p className="mt-1 text-slate-600">Brand: {product.brand}</p>
          )}
          <p className="mt-4 text-slate-700">{product.description}</p>
          <p className="mt-2 text-sm">MOQ: {product.moq}</p>
          <p className="text-sm">
            {product.inStock ? (
              <span className="text-green-600">In stock</span>
            ) : (
              <span className="text-amber-600">Limited availability</span>
            )}
          </p>

          <div className="mt-6 rounded-lg border bg-slate-50 p-4">
            {pricedProduct ? (
              <>
                <p className="text-3xl font-bold text-[#1e3a5f]">
                  {formatCurrency(pricedProduct.unitPrice)}
                </p>
                {pricedProduct.tiers.length > 1 && (
                  <ul className="mt-2 text-sm text-slate-600">
                    {pricedProduct.tiers.map((t) => (
                      <li key={t.minQty}>
                        {t.minQty}+ units: {formatCurrency(t.unitPrice)}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4">
                  <AddToCartButton productId={product.id} moq={product.moq} />
                </div>
              </>
            ) : (
              <>
                <p className="font-semibold text-[#c41e3a]">
                  Wholesale pricing available after sign-in
                </p>
                <Link
                  href="/login"
                  className="mt-3 inline-block rounded-md bg-[#1e3a5f] px-6 py-2 text-white"
                >
                  Sign in for pricing
                </Link>
              </>
            )}
          </div>

          {product.quoteOnly && (
            <p className="mt-4 text-sm text-amber-700">
              This item requires a quote for purchase.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
