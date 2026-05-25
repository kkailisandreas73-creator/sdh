import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth/session";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const { productId } = await params;
  const { quantityOnHand } = await req.json();

  const inventory = await prisma.inventory.upsert({
    where: { productId },
    update: { quantityOnHand: Number(quantityOnHand) },
    create: { productId, quantityOnHand: Number(quantityOnHand), reserved: 0 },
  });
  return jsonOk({ inventory });
}
