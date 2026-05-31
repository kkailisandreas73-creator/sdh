import { repos } from "@/lib/db";

export default async function AdminPricingPage() {
  const priceLists = await repos.pricingRepo.listPriceListsWithTiers();

  return (
    <div>
      <h1 className="text-2xl font-bold">Pricing</h1>
      {priceLists.map((list) => (
        <section key={list.id} className="mt-6">
          <h2 className="font-semibold">
            {list.name} {list.isDefault && "(default)"}
          </h2>
          <p className="text-sm text-slate-600">{list.tiers.length} tiers</p>
        </section>
      ))}
    </div>
  );
}
