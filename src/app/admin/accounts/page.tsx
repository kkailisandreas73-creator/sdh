import { repos } from "@/lib/db";

export default async function AdminAccountsPage() {
  const accounts = await repos.accountsRepo.listAllAccounts();

  return (
    <div>
      <h1 className="text-2xl font-bold">Accounts</h1>
      <ul className="mt-6 space-y-4">
        {accounts.map((a) => (
          <li key={a.id} className="rounded-lg border bg-white p-4">
            <p className="font-semibold">{a.companyName}</p>
            <p className="text-sm text-slate-600">
              Status: {a.status} · {a.users.length} user(s)
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
