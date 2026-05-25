"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminQuoteForm({
  quoteId,
  lines,
}: {
  quoteId: string;
  lines: { id: string; product: { name: string }; quantity: number }[];
}) {
  const router = useRouter();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/v1/admin/quotes/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: lines.map((l) => ({
          lineId: l.id,
          quotedUnitPrice: Number(prices[l.id] ?? 0),
        })),
      }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-2 border-t pt-4">
      {lines.map((line) => (
        <div key={line.id} className="flex items-center gap-2 text-sm">
          <span className="flex-1">
            {line.product.name} × {line.quantity}
          </span>
          <input
            type="number"
            step="0.01"
            required
            placeholder="Unit price"
            value={prices[line.id] ?? ""}
            onChange={(e) =>
              setPrices((p) => ({ ...p, [line.id]: e.target.value }))
            }
            className="w-28 rounded border px-2 py-1"
          />
        </div>
      ))}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-[#1e3a5f] px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        Send quote to buyer
      </button>
    </form>
  );
}
