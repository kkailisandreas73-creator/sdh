import Link from "next/link";
import { listAllQuotes } from "@/lib/services/quote.service";
import { AdminQuoteForm } from "@/components/admin/AdminQuoteForm";

export default async function AdminQuotesPage() {
  const quotes = await listAllQuotes();

  return (
    <div>
      <h1 className="text-2xl font-bold">Quotes</h1>
      <div className="mt-6 space-y-6">
        {quotes.map((quote) => (
          <div key={quote.id} className="rounded-lg border bg-white p-4">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">{quote.account?.companyName ?? "—"}</p>
                <p className="text-sm text-slate-500">{quote.user?.email ?? "—"}</p>
              </div>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                {quote.status}
              </span>
            </div>
            <ul className="mt-2 text-sm">
              {quote.lines.map((line) => (
                <li key={line.id}>
                  {line.product.name} × {line.quantity}
                </li>
              ))}
            </ul>
            {(quote.status === "SUBMITTED" || quote.status === "IN_REVIEW") && (
              <AdminQuoteForm quoteId={quote.id} lines={quote.lines} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
