import { prisma } from "@/lib/db";
import { ApproveAccountButton } from "@/components/admin/ApproveAccountButton";

export default async function AdminAccountsPage() {
  const accounts = await prisma.account.findMany({
    where: { status: "PENDING" },
    include: { users: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Pending B2B accounts</h1>
      <div className="mt-6 space-y-4">
        {accounts.length === 0 && (
          <p className="text-slate-600">No pending registrations.</p>
        )}
        {accounts.map((account) => (
          <div key={account.id} className="rounded-lg border bg-white p-4">
            <p className="font-semibold">{account.companyName}</p>
            <p className="text-sm text-slate-500">
              {account.users.map((u) => u.email).join(", ")}
            </p>
            <div className="mt-3 flex gap-2">
              <ApproveAccountButton accountId={account.id} status="ACTIVE" label="Approve" />
              <ApproveAccountButton accountId={account.id} status="REJECTED" label="Reject" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
