import { query } from "../pool";
import { mapCategory } from "../mappers";
import type { Category, CategoryAdminRow, CategoryTree } from "../types";

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
  const { rows } = await query(
    `WITH RECURSIVE trail AS (
       SELECT *, 0 AS depth FROM categories WHERE slug = $1
       UNION ALL
       SELECT p.*, t.depth + 1
       FROM categories p
       INNER JOIN trail t ON p.id = t.parent_id
     )
     SELECT id, slug, name, parent_id, vertical, sort_order FROM trail ORDER BY depth DESC`,
    [slug]
  );
  return rows.map(mapCategory);
}

/** Nested category tree as JSON from PostgreSQL (`category_tree_json`). */
export async function buildCategoryTree(): Promise<CategoryTree[]> {
  const { rows } = await query<{ tree: CategoryTree[] }>(
    `SELECT category_tree_json() AS tree`
  );
  const tree = rows[0]?.tree;
  return Array.isArray(tree) ? tree : [];
}

/** Flat admin tree rows: depth order and subtree product counts from SQL. */
export async function listCategoryAdminRows(): Promise<CategoryAdminRow[]> {
  const { rows } = await query<{
    id: string;
    slug: string;
    name: string;
    parent_id: string | null;
    vertical: string;
    sort_order: number;
    depth: number;
    product_count: string;
  }>(
    `WITH RECURSIVE
       descendants AS (
         SELECT id AS ancestor_id, id AS category_id FROM categories
         UNION ALL
         SELECT d.ancestor_id, c.id
         FROM descendants d
         INNER JOIN categories c ON c.parent_id = d.category_id
       ),
       subtree_counts AS (
         SELECT d.ancestor_id AS category_id, COUNT(p.id)::bigint AS product_count
         FROM descendants d
         LEFT JOIN products p ON p.category_id = d.category_id
         GROUP BY d.ancestor_id
       ),
       tree AS (
         SELECT
           c.id,
           c.slug,
           c.name,
           c.parent_id,
           c.vertical,
           c.sort_order,
           0 AS depth,
           ARRAY[LPAD(c.sort_order::text, 10, '0'), c.name] AS sort_path
         FROM categories c
         WHERE c.parent_id IS NULL
         UNION ALL
         SELECT
           c.id,
           c.slug,
           c.name,
           c.parent_id,
           c.vertical,
           c.sort_order,
           t.depth + 1,
           t.sort_path || ARRAY[LPAD(c.sort_order::text, 10, '0'), c.name]
         FROM categories c
         INNER JOIN tree t ON c.parent_id = t.id
       )
     SELECT
       t.id,
       t.slug,
       t.name,
       t.parent_id,
       t.vertical,
       t.sort_order,
       t.depth,
       COALESCE(sc.product_count, 0)::text AS product_count
     FROM tree t
     LEFT JOIN subtree_counts sc ON sc.category_id = t.id
     ORDER BY t.sort_path`
  );
  return rows.map((r) => ({
    ...mapCategory(r),
    depth: r.depth,
    productCount: Number(r.product_count),
  }));
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
