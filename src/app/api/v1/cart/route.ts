import { NextRequest } from "next/server";
import { getSessionUser, isActiveBuyer } from "@/lib/auth/session";
import {
  getCartView,
  addToCart,
  updateCartItem,
  removeCartItem,
} from "@/lib/services/cart.service";
import { cartAddSchema, cartUpdateSchema } from "@/lib/validators";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isActiveBuyer(user) || !user.accountId) {
    return jsonError("FORBIDDEN", "Active buyer account required", 403);
  }
  const cart = await getCartView(user.id, user.accountId);
  return jsonOk(cart);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isActiveBuyer(user)) {
    return jsonError("FORBIDDEN", "Active buyer account required", 403);
  }
  const body = await req.json();
  const parsed = cartAddSchema.safeParse(body);
  if (!parsed.success) return jsonError("VALIDATION", "Invalid input", 400);
  try {
    await addToCart(user.id, parsed.data.productId, parsed.data.quantity);
    const cart = await getCartView(user.id, user.accountId);
    return jsonOk(cart);
  } catch (e) {
    return jsonError("BAD_REQUEST", (e as Error).message, 400);
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isActiveBuyer(user)) {
    return jsonError("FORBIDDEN", "Active buyer account required", 403);
  }
  const body = await req.json();
  const { itemId, ...rest } = body;
  const parsed = cartUpdateSchema.safeParse(rest);
  if (!parsed.success || !itemId) return jsonError("VALIDATION", "Invalid input", 400);
  try {
    await updateCartItem(user.id, itemId, parsed.data.quantity);
    const cart = await getCartView(user.id, user.accountId);
    return jsonOk(cart);
  } catch (e) {
    return jsonError("BAD_REQUEST", (e as Error).message, 400);
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isActiveBuyer(user)) {
    return jsonError("FORBIDDEN", "Active buyer account required", 403);
  }
  const itemId = req.nextUrl.searchParams.get("itemId");
  if (!itemId) return jsonError("VALIDATION", "itemId required", 400);
  await removeCartItem(user.id, itemId);
  const cart = await getCartView(user.id, user.accountId);
  return jsonOk(cart);
}
