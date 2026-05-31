import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { repos } from "@/lib/db";

export default async function ProfilePage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const profile = await repos.usersRepo.findUserProfile(session.id);
  if (!profile) redirect("/login");

  const { user: dbUser, account, addresses } = profile;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Profile</h1>
      <dl className="mt-6 space-y-3 text-sm">
        <div>
          <dt className="font-medium text-slate-500">Name</dt>
          <dd>{dbUser.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Email</dt>
          <dd>{dbUser.email}</dd>
        </div>
        {account && (
          <>
            <div>
              <dt className="font-medium text-slate-500">Company</dt>
              <dd>{account.companyName}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Account status</dt>
              <dd>{account.status}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Payment terms</dt>
              <dd>{account.paymentTerms}</dd>
            </div>
          </>
        )}
      </dl>
      {addresses.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold">Addresses</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {addresses.map((a) => (
              <li key={a.id} className="rounded border bg-white p-3">
                {a.line1}, {a.city}, {a.state} {a.zip}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
