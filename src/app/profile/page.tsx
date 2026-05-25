import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { account: { include: { addresses: true } } },
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold">Profile</h1>
      <dl className="mt-6 space-y-3">
        <div>
          <dt className="text-sm text-slate-500">Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Name</dt>
          <dd>{user.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Role</dt>
          <dd>{user.role}</dd>
        </div>
        {dbUser?.account && (
          <>
            <div>
              <dt className="text-sm text-slate-500">Company</dt>
              <dd>{dbUser.account.companyName}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Account status</dt>
              <dd>{dbUser.account.status}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Payment terms</dt>
              <dd>{dbUser.account.paymentTerms}</dd>
            </div>
          </>
        )}
      </dl>
    </div>
  );
}
