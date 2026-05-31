import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { listRootCategories } from "@/lib/services/catalog.service";

export async function Header() {
  const session = await auth();
  const user = session?.user as { role?: string; email?: string } | undefined;
  let roots: Awaited<ReturnType<typeof listRootCategories>> = [];
  try {
    roots = await listRootCategories();
  } catch (e) {
    console.error("[header] failed to load categories:", e);
  }

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex flex-col">
          <span className="text-2xl font-extrabold tracking-tight text-[#c41e3a]">
            Super Discount
          </span>
          <span className="text-sm font-semibold uppercase tracking-widest text-slate-700">
            Wholesale
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-700">
          {roots.map((c) => (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              className="hover:text-[#c41e3a] transition-colors"
            >
              {c.name}
            </Link>
          ))}
          <Link href="/search" className="hover:text-[#c41e3a]">
            Search
          </Link>
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="text-[#1e3a5f] font-semibold">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link
                href="/cart"
                className="rounded-md bg-[#1e3a5f] px-3 py-2 text-white hover:bg-[#2d5a87]"
              >
                Cart
              </Link>
              <Link href="/orders" className="text-slate-600 hover:text-[#c41e3a]">
                Orders
              </Link>
              <Link href="/profile" className="text-slate-600 hover:text-[#c41e3a]">
                {user.email}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-[#c41e3a]">
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-[#c41e3a] px-4 py-2 text-white hover:bg-[#a01830]"
              >
                Register B2B
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
