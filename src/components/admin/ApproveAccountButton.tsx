"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApproveAccountButton({
  accountId,
  status,
  label,
}: {
  accountId: string;
  status: string;
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch(`/api/v1/admin/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`rounded px-3 py-1 text-sm text-white disabled:opacity-50 ${
        status === "ACTIVE" ? "bg-green-600" : "bg-slate-500"
      }`}
    >
      {loading ? "…" : label}
    </button>
  );
}
