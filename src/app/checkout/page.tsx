"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export default function CheckoutPage() {
  const router = useRouter();
  const [addressId, setAddressId] = useState("");
  const [addresses, setAddresses] = useState<{ id: string; line1: string; city: string }[]>([]);
  const [poNumber, setPoNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/v1/me")
      .then((r) => r.json())
      .then((data) => {
        const addrs = data.user?.account?.addresses ?? [];
        setAddresses(addrs);
        const def = addrs.find((a: { isDefault: boolean }) => a.isDefault) ?? addrs[0];
        if (def) setAddressId(def.id);
      });
  }, []);

  async function handleCheckout() {
    if (!addressId) {
      setMessage("Select a shipping address");
      return;
    }
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/v1/checkout/instant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shippingAddressId: addressId, poNumber }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error?.message ?? "Checkout failed");
      return;
    }
    if (data.mock || data.status === "PAID" || data.paymentMethod === "INVOICE_NET30") {
      router.push(`/orders/${data.orderId}`);
      return;
    }
    setMessage("Payment intent created. Configure Stripe for live card payments.");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold">Instant checkout</h1>
      <p className="mt-2 text-sm text-slate-600">
        Only in-stock, instant-eligible items are included.
      </p>
      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">Shipping address</label>
          <select
            value={addressId}
            onChange={(e) => setAddressId(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.line1}, {a.city}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">PO number (optional)</label>
          <input
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        {message && <p className="text-sm text-red-600">{message}</p>}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full rounded-md bg-[#c41e3a] py-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Processing…" : "Place order"}
        </button>
      </div>
    </div>
  );
}
