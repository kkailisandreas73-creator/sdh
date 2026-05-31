import { NextRequest } from "next/server";
import { repos } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth/session";
import { productSchema } from "@/lib/validators";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(req.nextUrl.searchParams.get("pageSize") ?? "50", 10) || 50)
  );
  const result = await repos.productsRepo.listProductsAdmin({ page, pageSize });
  return jsonOk(result);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid input", 400, parsed.error.flatten());

  const data = parsed.data;
  const product = await repos.productsRepo.createProduct({
    sku: data.sku,
    name: data.name,
    slug: data.slug,
    description: data.description,
    categoryId: data.categoryId,
    brand: data.brand,
    moq: data.moq,
    allowInstantCheckout: data.allowInstantCheckout,
    quoteOnly: data.quoteOnly,
    isActive: data.isActive,
  });
  if (product) {
    await repos.inventoryRepo.upsertInventory(product.id, 0, 0);
  }
  return jsonOk({ product }, 201);
}
