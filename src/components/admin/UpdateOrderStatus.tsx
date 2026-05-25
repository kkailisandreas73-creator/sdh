"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const statuses = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

export function UpdateOrderStatus({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [tracking, setTracking] = useState("");

  async function handleUpdate() {
    await fetch("/api/v1/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        status,
        trackingNumber: tracking || undefined,
        carrier: "UPS",
      }),
    });
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="rounded border px-2 py-1 text-sm"
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <input
        placeholder="Tracking #"
        value={tracking}
        onChange={(e) => setTracking(e.target.value)}
        className="rounded border px-2 py-1 text-sm"
      />
      <button
        onClick={handleUpdate}
        className="rounded bg-slate-700 px-3 py-1 text-sm text-white"
      >
        Update
      </button>
    </div>
  );
}
