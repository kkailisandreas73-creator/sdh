import { prisma } from "@/lib/db";

export default async function AdminPricingPage() {
  const priceLists = await prisma.priceList.findMany({
    include: {
      tiers: {
        include: { product: true },
        take: 20,
      },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Price lists</h1>
      {priceLists.map((list) => (
        <div key={list.id} className="mt-6 rounded-lg border bg-white p-4">
          <h2 className="font-semibold">
            {list.name} {list.isDefault && "(default)"}
          </h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-1">Product</th>
                <th>Min qty</th>
                <th>Unit price</th>
              </tr>
            </thead>
            <tbody>
              {list.tiers.map((tier) => (
                <tr key={tier.id} className="border-b">
                  <td className="py-1">{tier.product.name}</td>
                  <td>{tier.minQty}</td>
                  <td>${tier.unitPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
