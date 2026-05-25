import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth/session";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const { id } = await params;
  const body = await req.json();
  const { status, paymentTerms } = body;

  const account = await prisma.account.update({
    where: { id },
    data: {
      ...(status ? { status, approvedAt: status === "ACTIVE" ? new Date() : null, approvedById: user.id } : {}),
      ...(paymentTerms ? { paymentTerms } : {}),
    },
    include: { users: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      entity: "Account",
      entityId: id,
      action: `STATUS_${status}`,
      payload: JSON.stringify(body),
    },
  });

  return jsonOk({ account });
}
