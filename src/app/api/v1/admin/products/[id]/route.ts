import { NextRequest } from "next/server";
import { repos } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth/session";
import { productSchema } from "@/lib/validators";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const { id } = await params;
  const body = await req.json();
  const parsed = productSchema.safeParse({ ...body });
  if (!parsed.success) return jsonError("VALIDATION", "Invalid input", 400);

  const data = parsed.data;
  const product = await repos.productsRepo.updateProduct(id, {
    name: data.name,
    description: data.description,
    categoryId: data.categoryId,
    brand: data.brand ?? null,
    moq: data.moq,
    isActive: data.isActive,
  });
  return jsonOk({ product });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const { id } = await params;
  await repos.productsRepo.deactivateProduct(id);
  return jsonOk({ success: true });
}
