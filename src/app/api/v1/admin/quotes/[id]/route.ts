import { NextRequest } from "next/server";
import { getSessionUser, isAdmin } from "@/lib/auth/session";
import { adminPriceQuote } from "@/lib/services/quote.service";
import { quotePriceSchema } from "@/lib/validators";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      lines: { include: { product: true } },
      account: true,
      user: true,
    },
  });
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
  const parsed = quotePriceSchema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid input", 400);

  const quote = await adminPriceQuote(
    id,
    parsed.data.lines,
    parsed.data.adminNotes
  );
  return jsonOk({ quote });
}
