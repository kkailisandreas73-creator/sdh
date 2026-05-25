import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth/session";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const priceLists = await prisma.priceList.findMany({
    include: { tiers: { include: { product: true } } },
  });
  return jsonOk({ priceLists });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const body = await req.json();
  const { productId, minQty, unitPrice, priceListId } = body;

  const listId =
    priceListId ??
    (await prisma.priceList.findFirst({ where: { isDefault: true } }))?.id;
  if (!listId) return jsonError("NOT_FOUND", "No price list", 404);

  const tier = await prisma.priceTier.upsert({
    where: {
      priceListId_productId_minQty: {
        priceListId: listId,
        productId,
        minQty: Number(minQty),
      },
    },
    update: { unitPrice: Number(unitPrice) },
    create: {
      priceListId: listId,
      productId,
      minQty: Number(minQty),
      unitPrice: Number(unitPrice),
    },
  });
  return jsonOk({ tier });
}
