import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth/session";
import { productSchema } from "@/lib/validators";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const products = await prisma.product.findMany({
    include: { category: true, inventory: true, images: true },
    orderBy: { name: "asc" },
  });
  return jsonOk({ products });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid input", 400, parsed.error.flatten());

  const product = await prisma.product.create({
    data: {
      ...parsed.data,
      inventory: { create: { quantityOnHand: 0, reserved: 0 } },
    },
  });
  return jsonOk({ product }, 201);
}
