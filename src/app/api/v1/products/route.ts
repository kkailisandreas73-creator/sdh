import { NextRequest } from "next/server";
import { listProductsPublic } from "@/lib/services/catalog.service";
import { listPricedProducts } from "@/lib/services/pricing.service";
import { getSessionUser, isActiveBuyer } from "@/lib/auth/session";
import { jsonOk } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const params = {
    vertical: searchParams.get("vertical") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
    pageSize: Number(searchParams.get("pageSize") ?? 24),
  };

  const user = await getSessionUser();
  if (user && isActiveBuyer(user) && user.accountId) {
    const result = await listPricedProducts(params, user.accountId);
    return jsonOk(result);
  }

  const result = await listProductsPublic(params);
  return jsonOk(result);
}
