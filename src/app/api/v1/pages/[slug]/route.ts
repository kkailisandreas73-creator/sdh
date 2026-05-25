import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const page = await prisma.staticPage.findUnique({ where: { slug } });
  if (!page) return jsonError("NOT_FOUND", "Page not found", 404);
  return jsonOk({ page });
}
