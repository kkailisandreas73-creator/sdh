import { notFound, redirect } from "next/navigation";
import { getSessionUser, isActiveBuyer } from "@/lib/auth/session";
import { getOrder } from "@/lib/services/order.service";
import { formatCurrency } from "@/lib/utils";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const order = await getOrder(id, user.accountId ?? undefined);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Order details</h1>
      <p className="mt-2 text-sm text-slate-500">Status: {order.status}</p>
      <ul className="mt-6 space-y-2">
        {order.lines.map((line) => (
          <li key={line.id} className="flex justify-between border-b py-2">
            <span>
              {line.nameSnapshot} × {line.quantity}
            </span>
            <span>{formatCurrency(line.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 text-right">
        <p>Subtotal: {formatCurrency(order.subtotal)}</p>
        <p>Tax: {formatCurrency(order.tax)}</p>
        <p>Shipping: {formatCurrency(order.shipping)}</p>
        <p className="text-lg font-bold">Total: {formatCurrency(order.total)}</p>
      </div>
    </div>
  );
}
