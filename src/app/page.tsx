import Link from "next/link";

const categories = [
  {
    slug: "industrial",
    title: "Industrial",
    description: "Tools, safety equipment, and warehouse supplies.",
    color: "from-slate-700 to-slate-900",
  },
  {
    slug: "diy",
    title: "DIY",
    description: "Hardware, power tools, paint, and building supplies.",
    color: "from-[#1e3a5f] to-[#2d5a87]",
  },
  {
    slug: "furniture",
    title: "Furniture",
    description: "Office, warehouse, and commercial furniture at scale.",
    color: "from-[#c41e3a] to-[#8b1529]",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-[#1e3a5f] to-[#0f2744] text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
            Super Discount Wholesale
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-200">
            B2B pricing on industrial, DIY, and furniture — register for your
            wholesale account and save on every order.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="rounded-md bg-[#c41e3a] px-8 py-3 font-semibold text-white hover:bg-[#a01830]"
            >
              Open B2B Account
            </Link>
            <Link
              href="/industrial"
              className="rounded-md border border-white/40 px-8 py-3 font-semibold hover:bg-white/10"
            >
              Browse Catalog
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-slate-900">
          Shop by category
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/${cat.slug}`}
              className={`rounded-xl bg-gradient-to-br ${cat.color} p-8 text-white shadow-lg transition hover:scale-[1.02]`}
            >
              <h3 className="text-2xl font-bold">{cat.title}</h3>
              <p className="mt-2 text-sm text-white/80">{cat.description}</p>
              <span className="mt-4 inline-block text-sm font-semibold underline">
                Shop now →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-xl font-bold">Why Super Discount Wholesale?</h2>
          <ul className="mt-6 space-y-3 text-slate-600">
            <li>Volume tier pricing for approved B2B accounts</li>
            <li>Instant checkout on in-stock items</li>
            <li>Quote requests for large and custom orders</li>
            <li>Net-30 terms available for qualified buyers</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
