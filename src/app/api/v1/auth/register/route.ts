import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validators";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION", "Invalid input", 400, parsed.error.flatten());
  }

  const { email, password, name, companyName, taxId } = parsed.data;
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) return jsonError("CONFLICT", "Email already registered", 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const account = await prisma.account.create({
    data: {
      companyName,
      taxId,
      status: "PENDING",
      paymentTerms: "CARD_ONLY",
    },
  });

  await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: "BUYER",
      accountId: account.id,
    },
  });

  return jsonOk({ message: "Registration submitted for approval" }, 201);
}
