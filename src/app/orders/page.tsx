import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isActiveBuyer } from "@/lib/auth/session";
import { listOrdersForAccount } from "@/lib/services/order.service";
import { formatCurrency } from "@/lib/utils";

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isActiveBuyer(user) || !user.accountId) redirect("/cart");

  const orders = await listOrdersForAccount(user.accountId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="mt-6 space-y-4">
        {orders.length === 0 && (
          <p className="text-slate-600">No orders yet.</p>
        )}
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="block rounded-lg border bg-white p-4 hover:shadow-md"
          >
            <div className="flex justify-between">
              <span className="font-mono text-sm">{order.id.slice(0, 8)}…</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                {order.status}
              </span>
            </div>
            <p className="mt-2 font-semibold">{formatCurrency(order.total)}</p>
            <p className="text-sm text-slate-500">
              {order.createdAt.toLocaleDateString()} · {order.lines.length} items
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
