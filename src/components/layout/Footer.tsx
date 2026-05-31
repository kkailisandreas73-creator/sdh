import Link from "next/link";
import { listRootCategories } from "@/lib/services/catalog.service";

export async function Footer() {
  let roots: Awaited<ReturnType<typeof listRootCategories>> = [];
  try {
    roots = await listRootCategories();
  } catch {
    roots = [];
  }

  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-lg font-bold text-white">Super Discount Wholesale</p>
            <p className="mt-2 text-sm">Wholesale supplies at competitive prices.</p>
          </div>
          <div>
            <p className="font-semibold text-white">Shop</p>
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
              {roots.length === 0 ? (
                <li>
                  <Link href="/search" className="hover:text-white">
                    Search
                  </Link>
                </li>
              ) : (
                roots.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/categories/${c.slug}`} className="hover:text-white">
                      {c.name}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white">Company</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <Link href="/pages/about" className="hover:text-white">
                  About
                </Link>
              </li>
              <li>
                <Link href="/pages/contact" className="hover:text-white">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/pages/terms" className="hover:text-white">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/pages/privacy" className="hover:text-white">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Super Discount Wholesale. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
