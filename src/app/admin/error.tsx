"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-semibold text-red-800">Admin error</h2>
      <p className="mt-2 text-sm text-red-700">
        {error.message || "Something went wrong loading the admin area."}
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Check that the database is running, <code className="text-xs">DATABASE_URL</code> is
        set, and you have run <code className="text-xs">npm run db:schema</code> and{" "}
        <code className="text-xs">npm run db:seed</code>.
      </p>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded bg-[#1e3a5f] px-3 py-2 text-sm text-white"
        >
          Try again
        </button>
        <Link href="/login" className="rounded border px-3 py-2 text-sm">
          Sign in
        </Link>
      </div>
    </div>
  );
}
