import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("UNAUTHORIZED", "Not logged in", 401);

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { account: { include: { addresses: true } } },
  });

  return jsonOk({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      account: dbUser?.account,
    },
  });
}
