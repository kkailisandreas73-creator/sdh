import { listCategories } from "@/lib/services/catalog.service";
import { jsonOk } from "@/lib/api-response";

export async function GET() {
  const categories = await listCategories();
  return jsonOk({ categories });
}
