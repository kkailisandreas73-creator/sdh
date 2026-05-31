import { query } from "../pool";
import { mapCategory } from "../mappers";
import type { Category, CategoryWithChildren } from "../types";

export async function listRootCategoriesWithChildren(): Promise<CategoryWithChildren[]> {
  const { rows } = await query(
    `SELECT * FROM categories ORDER BY sort_order ASC, name ASC`
  );
  const all = rows.map(mapCategory);
  const roots = all.filter((c) => !c.parentId);
  return roots.map((root) => ({
    ...root,
    children: all.filter((c) => c.parentId === root.id).sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export async function listSubcategoriesByVertical(vertical: string) {
  const { rows } = await query(
    `SELECT * FROM categories WHERE vertical = $1 AND parent_id IS NOT NULL ORDER BY name ASC`,
    [vertical]
  );
  return rows.map(mapCategory);
}

export async function findCategoryBySlug(slug: string) {
  const { rows } = await query(`SELECT * FROM categories WHERE slug = $1`, [slug]);
  return rows[0] ? mapCategory(rows[0]) : null;
}
