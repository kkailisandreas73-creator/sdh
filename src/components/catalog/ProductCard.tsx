import Link from "next/link";
import type { PublicProduct, PricedProduct } from "@/types";
import { formatCurrency } from "@/lib/utils";

type Props = {
  product: PublicProduct | PricedProduct;
  showPrice?: boolean;
};

function hasPrice(p: PublicProduct | PricedProduct): p is PricedProduct {
  return "unitPrice" in p && typeof (p as PricedProduct).unitPrice === "number";
}

export function ProductCard({ product, showPrice = false }: Props) {
  const image = product.images[0]?.url;
  const priced = showPrice && hasPrice(product);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.images[0]?.alt ?? product.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-slate-500">{product.sku}</p>
        <h3 className="mt-1 font-semibold text-slate-900 group-hover:text-[#c41e3a]">
          {product.name}
        </h3>
        {product.brand && (
          <p className="text-sm text-slate-500">{product.brand}</p>
        )}
        <div className="mt-auto pt-3">
          {priced ? (
            <p className="text-lg font-bold text-[#1e3a5f]">
              {formatCurrency(product.unitPrice)}
              <span className="text-xs font-normal text-slate-500"> / unit</span>
            </p>
          ) : (
            <p className="text-sm font-medium text-[#c41e3a]">
              Sign in for pricing
            </p>
          )}
          {!product.inStock && (
            <span className="mt-1 inline-block text-xs text-amber-600">Limited stock</span>
          )}
        </div>
      </div>
    </Link>
  );
}
