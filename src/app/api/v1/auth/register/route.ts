import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { repos } from "@/lib/db";
import { registerSchema } from "@/lib/validators";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Invalid input", 400, parsed.error.flatten());
  }

  const { email, password, name, companyName, taxId } = parsed.data;
  const existing = await repos.usersRepo.findUserByEmail(email);
  if (existing) return jsonError("CONFLICT", "Email already registered", 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const account = await repos.accountsRepo.createAccount({
    companyName,
    taxId,
    status: "PENDING",
    paymentTerms: "CARD_ONLY",
  });

  await repos.usersRepo.createUser({
    email,
    passwordHash,
    name,
    role: "BUYER",
    accountId: account.id,
  });

  return jsonOk({ message: "Registration submitted for approval" }, 201);
}
