import { listAllOrders } from "@/lib/services/order.service";
import { formatCurrency } from "@/lib/utils";
import { UpdateOrderStatus } from "@/components/admin/UpdateOrderStatus";

export default async function AdminOrdersPage() {
  const orders = await listAllOrders();

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="mt-6 space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-lg border bg-white p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-mono text-sm">{order.id}</p>
                <p className="text-sm">{order.account.companyName}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(order.total)}</p>
                <p className="text-xs text-slate-500">{order.status}</p>
              </div>
            </div>
            <UpdateOrderStatus orderId={order.id} currentStatus={order.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
