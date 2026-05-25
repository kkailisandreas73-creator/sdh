import { getSessionUser, isActiveBuyer } from "@/lib/auth/session";
import { acceptQuote } from "@/lib/services/quote.service";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || !isActiveBuyer(user)) {
    return jsonError("FORBIDDEN", "Active buyer account required", 403);
  }
  const { id } = await params;
  try {
    const order = await acceptQuote(id, user.id);
    return jsonOk({ order });
  } catch (e) {
    return jsonError("ACCEPT_FAILED", (e as Error).message, 400);
  }
}
