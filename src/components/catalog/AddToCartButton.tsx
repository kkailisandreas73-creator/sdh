"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddToCartButton({
  productId,
  moq,
}: {
  productId: string;
  moq: number;
}) {
  const [qty, setQty] = useState(moq);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAdd() {
    setLoading(true);
    await fetch("/api/v1/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: qty }),
    });
    setLoading(false);
    router.push("/cart");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-sm text-slate-600">
        Qty (MOQ {moq})
        <input
          type="number"
          min={moq}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="ml-2 w-20 rounded border px-2 py-1"
        />
      </label>
      <button
        onClick={handleAdd}
        disabled={loading}
        className="rounded-md bg-[#c41e3a] px-6 py-2 font-medium text-white hover:bg-[#a01830] disabled:opacity-50"
      >
        {loading ? "Adding…" : "Add to cart"}
      </button>
    </div>
  );
}
