import Link from "next/link";
import type { CategoryTree as CategoryTreeNode } from "@/lib/db/types";

function CategoryTreeRows({
  nodes,
  depth,
  productCounts,
}: {
  nodes: CategoryTreeNode[];
  depth: number;
  productCounts: Map<string, number>;
}) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.id}>
          <div
            className="flex items-center gap-3 border-b py-2 text-sm"
            style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
          >
            <Link
              href={`/admin/categories/${node.slug}`}
              className="font-medium text-[#1e3a5f] hover:underline"
            >
              {node.name}
            </Link>
            <span className="text-slate-400">{node.slug}</span>
            <span className="ml-auto text-slate-500">
              {productCounts.get(node.id) ?? 0} products
            </span>
          </div>
          {node.children.length > 0 && (
            <CategoryTreeRows
              nodes={node.children}
              depth={depth + 1}
              productCounts={productCounts}
            />
          )}
        </div>
      ))}
    </>
  );
}

export async function CategoryTree({ tree }: { tree: CategoryTreeNode[] }) {
  const { repos } = await import("@/lib/db");
  const productCounts = new Map<string, number>();

  async function walk(nodes: CategoryTreeNode[]) {
    for (const node of nodes) {
      productCounts.set(node.id, await repos.categoriesRepo.countProductsInSubtree(node.id));
      if (node.children.length > 0) await walk(node.children);
    }
  }
  await walk(tree);

  if (tree.length === 0) {
    return <p className="text-sm text-slate-500">No categories yet. Run an import from Admin → Import.</p>;
  }

  return (
    <div className="rounded-lg border bg-white">
      <CategoryTreeRows nodes={tree} depth={0} productCounts={productCounts} />
    </div>
  );
}
