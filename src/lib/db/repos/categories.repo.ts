import { query } from "../pool";
import { mapCategory } from "../mappers";
import type { Category, CategoryTree } from "../types";

export async function listAllCategories(): Promise<Category[]> {
  const { rows } = await query(
    `SELECT * FROM categories ORDER BY sort_order ASC, name ASC`
  );
  return rows.map(mapCategory);
}

export async function listRootCategories(): Promise<Category[]> {
  const { rows } = await query(
    `SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort_order ASC, name ASC`
  );
  return rows.map(mapCategory);
}

export async function listChildren(parentId: string): Promise<Category[]> {
  const { rows } = await query(
    `SELECT * FROM categories WHERE parent_id = $1 ORDER BY sort_order ASC, name ASC`,
    [parentId]
  );
  return rows.map(mapCategory);
}

export async function findCategoryBySlug(slug: string): Promise<Category | null> {
  const { rows } = await query(`SELECT * FROM categories WHERE slug = $1`, [slug]);
  return rows[0] ? mapCategory(rows[0]) : null;
}

export async function findCategoryById(id: string): Promise<Category | null> {
  const { rows } = await query(`SELECT * FROM categories WHERE id = $1`, [id]);
  return rows[0] ? mapCategory(rows[0]) : null;
}

export async function getCategoryBreadcrumb(slug: string): Promise<Category[]> {
  const trail: Category[] = [];
  let current = await findCategoryBySlug(slug);
  while (current) {
    trail.unshift(current);
    if (!current.parentId) break;
    current = await findCategoryById(current.parentId);
  }
  return trail;
}

function buildTreeFromFlat(all: Category[]): CategoryTree[] {
  const byParent = new Map<string | null, Category[]>();
  for (const c of all) {
    const key = c.parentId;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }

  function attach(parentId: string | null): CategoryTree[] {
    const nodes = byParent.get(parentId) ?? [];
    return nodes.map((c) => ({
      ...c,
      children: attach(c.id),
    }));
  }

  return attach(null);
}

export async function buildCategoryTree(): Promise<CategoryTree[]> {
  const all = await listAllCategories();
  return buildTreeFromFlat(all);
}

/** @deprecated Use buildCategoryTree or listRootCategories */
export async function listRootCategoriesWithChildren(): Promise<CategoryTree[]> {
  return buildCategoryTree();
}

export async function listSubcategoriesByVertical(vertical: string): Promise<Category[]> {
  const { rows } = await query(
    `SELECT * FROM categories WHERE vertical = $1 AND parent_id IS NOT NULL ORDER BY name ASC`,
    [vertical]
  );
  return rows.map(mapCategory);
}

export async function countProductsInSubtree(categoryId: string): Promise<number> {
  const { rows } = await query<{ count: string }>(
    `WITH RECURSIVE subtree AS (
       SELECT id FROM categories WHERE id = $1
       UNION ALL
       SELECT c.id FROM categories c
       INNER JOIN subtree s ON c.parent_id = s.id
     )
     SELECT COUNT(*)::text AS count FROM products p
     WHERE p.category_id IN (SELECT id FROM subtree)`,
    [categoryId]
  );
  return Number(rows[0]?.count ?? 0);
}
