import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Reset password</h1>
      <p className="mt-4 text-slate-600">
        Password reset via email is not configured in this MVP. Contact{" "}
        <a href="mailto:sales@superdiscountwholesale.com" className="text-[#c41e3a]">
          sales@superdiscountwholesale.com
        </a>
        .
      </p>
      <Link href="/login" className="mt-6 inline-block text-[#1e3a5f] hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
