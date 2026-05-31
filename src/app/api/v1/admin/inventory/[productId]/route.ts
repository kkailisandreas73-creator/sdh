import { NextRequest } from "next/server";
import { repos } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth/session";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const { productId } = await params;
  const body = await req.json();
  const quantityOnHand = Number(body.quantityOnHand);
  if (Number.isNaN(quantityOnHand)) {
    return jsonError("VALIDATION", "quantityOnHand required", 400);
  }

  const inventory = await repos.inventoryRepo.upsertInventory(
    productId,
    quantityOnHand
  );
  return jsonOk({ inventory });
}
