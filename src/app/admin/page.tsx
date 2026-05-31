import Link from "next/link";
import { repos } from "@/lib/db";

export const dynamic = "force-dynamic";

async function safeCount(label: string, fn: () => Promise<number>) {
  try {
    return await fn();
  } catch (e) {
    console.error(`[admin] ${label}:`, e);
    return 0;
  }
}

export default async function AdminDashboard() {
  const [pending, orders, quotes] = await Promise.all([
    safeCount("pending accounts", () => repos.accountsRepo.countPendingAccounts()),
    safeCount("orders", () => repos.ordersRepo.countOrders()),
    safeCount("quotes", () => repos.ordersRepo.countQuotesByStatus("SUBMITTED")),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link href="/admin/accounts" className="rounded-lg border bg-white p-6 hover:shadow">
          <p className="text-3xl font-bold text-[#c41e3a]">{pending}</p>
          <p className="text-sm text-slate-600">Pending accounts</p>
        </Link>
        <Link href="/admin/orders" className="rounded-lg border bg-white p-6 hover:shadow">
          <p className="text-3xl font-bold text-[#1e3a5f]">{orders}</p>
          <p className="text-sm text-slate-600">Orders</p>
        </Link>
        <Link href="/admin/quotes" className="rounded-lg border bg-white p-6 hover:shadow">
          <p className="text-3xl font-bold text-[#1e3a5f]">{quotes}</p>
          <p className="text-sm text-slate-600">Quotes to review</p>
        </Link>
      </div>
    </div>
  );
}
