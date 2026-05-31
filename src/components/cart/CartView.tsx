"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import type { CartLineView } from "@/types";

export function CartView({
  items,
  subtotal,
}: {
  items: CartLineView[];
  subtotal: number;
}) {
  const router = useRouter();

  async function updateQty(itemId: string, quantity: number) {
    await fetch("/api/v1/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, quantity }),
    });
    router.refresh();
  }

  async function removeItem(itemId: string) {
    await fetch(`/api/v1/cart?itemId=${itemId}`, { method: "DELETE" });
    router.refresh();
  }

  async function requestQuote() {
    const notes = prompt("Notes for sales team (optional)") ?? "";
    await fetch("/api/v1/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerNotes: notes }),
    });
    router.push("/quotes");
    router.refresh();
  }

  const instantLines = items.filter((l) => l.eligibility === "instant");
  const quoteLines = items.filter((l) => l.eligibility === "quoteOnly");

  if (items.length === 0) {
    return (
      <p className="text-slate-600">
        Your cart is empty.{" "}
        <Link href="/" className="text-[#c41e3a]">
          Browse products
        </Link>
      </p>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        {items.map((line) => (
          <div
            key={line.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-white p-4"
          >
            <div>
              <Link
                href={`/products/${line.product.slug}`}
                className="font-semibold hover:text-[#c41e3a]"
              >
                {line.product.name}
              </Link>
              <p className="text-sm text-slate-500">{line.product.sku}</p>
              <span
                className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${
                  line.eligibility === "instant"
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {line.eligibility === "instant" ? "Instant checkout" : "Quote required"}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min={line.product.moq}
                value={line.quantity}
                onChange={(e) => updateQty(line.id, Number(e.target.value))}
                className="w-16 rounded border px-2 py-1"
              />
              <p className="w-24 text-right font-semibold">
                {formatCurrency(line.lineTotal)}
              </p>
              <button
                onClick={() => removeItem(line.id)}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-white p-6 h-fit">
        <p className="text-lg font-bold">Subtotal: {formatCurrency(subtotal)}</p>
        {instantLines.length > 0 && (
          <Link
            href="/checkout"
            className="mt-4 block w-full rounded-md bg-[#1e3a5f] py-2 text-center text-white"
          >
            Checkout ({instantLines.length} items)
          </Link>
        )}
        {quoteLines.length > 0 && (
          <button
            onClick={requestQuote}
            className="mt-3 w-full rounded-md border border-[#c41e3a] py-2 text-[#c41e3a] hover:bg-red-50"
          >
            Request quote
          </button>
        )}
        {instantLines.length === 0 && quoteLines.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            All items require a sales quote.
          </p>
        )}
      </div>
    </div>
  );
}
