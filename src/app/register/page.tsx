"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        name: form.get("name"),
        companyName: form.get("companyName"),
        taxId: form.get("taxId") || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message ?? "Registration failed");
      return;
    }
    router.push("/login?registered=1");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">Register B2B account</h1>
      <p className="mt-2 text-sm text-slate-600">
        Your account will be reviewed before wholesale pricing is enabled.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">Company name</label>
          <input name="companyName" required className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Contact name</label>
          <input name="name" required className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input name="email" type="email" required className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Password (min 8)</label>
          <input name="password" type="password" required minLength={8} className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Tax ID (optional)</label>
          <input name="taxId" className="mt-1 w-full rounded border px-3 py-2" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded-md bg-[#c41e3a] py-2 font-medium text-white">
          Submit registration
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="text-[#1e3a5f] hover:underline">Already have an account?</Link>
      </p>
    </div>
  );
}
