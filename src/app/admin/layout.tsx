import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/auth/session";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/accounts", label: "Accounts" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/quotes", label: "Quotes" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/pricing", label: "Pricing" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) redirect("/login");

  return (
    <div className="flex min-h-[60vh]">
      <aside className="w-56 shrink-0 border-r bg-white p-4">
        <p className="font-bold text-[#1e3a5f]">Admin</p>
        <nav className="mt-4 space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block rounded px-2 py-1 text-sm hover:bg-slate-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="mt-6 block text-sm text-slate-500 hover:text-[#c41e3a]">
          ← Storefront
        </Link>
      </aside>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
