import { redirect } from "next/navigation";
import { getSessionUser, isActiveBuyer } from "@/lib/auth/session";
import { listQuotesForAccount } from "@/lib/services/quote.service";
import { AcceptQuoteButton } from "@/components/quotes/AcceptQuoteButton";

export default async function QuotesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isActiveBuyer(user) || !user.accountId) redirect("/cart");

  const quotes = await listQuotesForAccount(user.accountId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold">Quotes</h1>
      <div className="mt-6 space-y-4">
        {quotes.length === 0 && <p className="text-slate-600">No quotes yet.</p>}
        {quotes.map((quote) => (
          <div key={quote.id} className="rounded-lg border bg-white p-4">
            <div className="flex justify-between">
              <span className="font-mono text-sm">{quote.id.slice(0, 8)}…</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                {quote.status}
              </span>
            </div>
            {quote.buyerNotes && (
              <p className="mt-2 text-sm text-slate-600">{quote.buyerNotes}</p>
            )}
            <ul className="mt-2 text-sm">
              {quote.lines.map((line) => (
                <li key={line.id}>
                  {line.product.name} × {line.quantity}
                  {line.quotedUnitPrice != null &&
                    ` — $${line.quotedUnitPrice.toFixed(2)}`}
                </li>
              ))}
            </ul>
            {quote.status === "QUOTED" && (
              <AcceptQuoteButton quoteId={quote.id} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
