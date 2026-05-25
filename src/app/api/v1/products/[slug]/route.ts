import { NextRequest } from "next/server";
import { getProductBySlugPublic } from "@/lib/services/catalog.service";
import { getPricedProductBySlug } from "@/lib/services/pricing.service";
import { getSessionUser, isActiveBuyer } from "@/lib/auth/session";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const user = await getSessionUser();

  if (user && isActiveBuyer(user) && user.accountId) {
    const product = await getPricedProductBySlug(slug, user.accountId);
    if (!product) return jsonError("NOT_FOUND", "Product not found", 404);
    return jsonOk({ product });
  }

  const product = await getProductBySlugPublic(slug);
  if (!product) return jsonError("NOT_FOUND", "Product not found", 404);
  return jsonOk({ product });
}
