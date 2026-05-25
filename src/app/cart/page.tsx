import { redirect } from "next/navigation";
import { getSessionUser, isActiveBuyer } from "@/lib/auth/session";
import { getCartView } from "@/lib/services/cart.service";
import { CartView } from "@/components/cart/CartView";

export default async function CartPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isActiveBuyer(user) || !user.accountId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Account pending approval</h1>
        <p className="mt-2 text-slate-600">
          Your B2B account must be approved before you can use the cart.
        </p>
      </div>
    );
  }

  const cart = await getCartView(user.id, user.accountId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-2xl font-bold">Your cart</h1>
      <div className="mt-8">
        <CartView items={cart.items} subtotal={cart.subtotal} />
      </div>
    </div>
  );
}
