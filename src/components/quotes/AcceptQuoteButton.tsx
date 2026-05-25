"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AcceptQuoteButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    const res = await fetch(`/api/v1/quotes/${quoteId}/accept`, { method: "POST" });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/orders/${data.order.id}`);
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleAccept}
      disabled={loading}
      className="mt-3 rounded-md bg-[#1e3a5f] px-4 py-2 text-sm text-white disabled:opacity-50"
    >
      {loading ? "Accepting…" : "Accept quote & create order"}
    </button>
  );
}
