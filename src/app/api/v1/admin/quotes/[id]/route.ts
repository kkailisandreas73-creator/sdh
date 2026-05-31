import { NextRequest } from "next/server";
import { repos } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth/session";
import { adminPriceQuote } from "@/lib/services/quote.service";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const { id } = await params;
  const quote = await repos.quotesRepo.getQuoteById(id);
  if (!quote) return jsonError("NOT_FOUND", "Quote not found", 404);
  return jsonOk({ quote });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const { id } = await params;
  const body = await req.json();
  const { lines, adminNotes } = body;

  const quote = await adminPriceQuote(id, lines, adminNotes);
  return jsonOk({ quote });
}
