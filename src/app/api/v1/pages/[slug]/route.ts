import { repos } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const page = await repos.staticPagesRepo.findStaticPageBySlug(slug);
  if (!page) return jsonError("NOT_FOUND", "Page not found", 404);
  return jsonOk({ page });
}
