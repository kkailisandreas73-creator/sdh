"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-slate-500 hover:text-[#c41e3a]"
    >
      Sign out
    </button>
  );
}
