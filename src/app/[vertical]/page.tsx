import { redirect } from "next/navigation";
import { repos } from "@/lib/db";

/** Legacy /industrial, /diy, /furniture URLs → first root category or home */
export default async function LegacyVerticalPage({
  params,
}: {
  params: Promise<{ vertical: string }>;
}) {
  const roots = await repos.categoriesRepo.listRootCategories();
  if (roots.length > 0) {
    redirect(`/categories/${roots[0].slug}`);
  }
  redirect("/");
}
