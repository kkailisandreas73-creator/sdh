import { repos } from "@/lib/db";
import { CategoryTree } from "@/components/admin/CategoryTree";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const tree = await repos.categoriesRepo.buildCategoryTree();

  return (
    <div>
      <h1 className="text-2xl font-bold">Categories</h1>
      <p className="mt-2 text-sm text-slate-600">
        Browse the category tree. Click a category to view products in that branch.
      </p>
      <div className="mt-6">
        <CategoryTree tree={tree} />
      </div>
    </div>
  );
}
