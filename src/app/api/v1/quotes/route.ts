import { NextRequest } from "next/server";
import { getSessionUser, isActiveBuyer } from "@/lib/auth/session";
import { submitQuote, listQuotesForAccount } from "@/lib/services/quote.service";
import { quoteSubmitSchema } from "@/lib/validators";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isActiveBuyer(user) || !user.accountId) {
    return jsonError("FORBIDDEN", "Active buyer account required", 403);
  }
  const quotes = await listQuotesForAccount(user.accountId);
  return jsonOk({ quotes });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isActiveBuyer(user) || !user.accountId) {
    return jsonError("FORBIDDEN", "Active buyer account required", 403);
  }
  const body = await req.json();
  const parsed = quoteSubmitSchema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid input", 400);

  try {
    const quote = await submitQuote({
      userId: user.id,
      accountId: user.accountId,
      buyerNotes: parsed.data.buyerNotes,
      lineIds: parsed.data.lineIds,
    });
    return jsonOk({ quote }, 201);
  } catch (e) {
    return jsonError("QUOTE_FAILED", (e as Error).message, 400);
  }
}
