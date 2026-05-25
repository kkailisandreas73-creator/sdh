import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-lg font-bold text-white">Super Discount Wholesale</p>
            <p className="mt-2 text-sm">
              Industrial, DIY, and furniture supplies at wholesale prices.
            </p>
          </div>
          <div>
            <p className="font-semibold text-white">Shop</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li><Link href="/industrial" className="hover:text-white">Industrial</Link></li>
              <li><Link href="/diy" className="hover:text-white">DIY</Link></li>
              <li><Link href="/furniture" className="hover:text-white">Furniture</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white">Company</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li><Link href="/pages/about" className="hover:text-white">About</Link></li>
              <li><Link href="/pages/contact" className="hover:text-white">Contact</Link></li>
              <li><Link href="/pages/terms" className="hover:text-white">Terms</Link></li>
              <li><Link href="/pages/privacy" className="hover:text-white">Privacy</Link></li>
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
