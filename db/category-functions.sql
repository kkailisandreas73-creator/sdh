-- Nested category JSON and subtree product counts (used by admin/API repos).

CREATE OR REPLACE FUNCTION category_node(p_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'id', c.id,
    'slug', c.slug,
    'name', c.name,
    'parentId', c.parent_id,
    'vertical', c.vertical,
    'sortOrder', c.sort_order,
    'children', COALESCE(
      (
        SELECT jsonb_agg(category_node(ch.id) ORDER BY ch.sort_order, ch.name)
        FROM categories ch
        WHERE ch.parent_id = c.id
      ),
      '[]'::jsonb
    )
  )
  FROM categories c
  WHERE c.id = p_id;
$$;

CREATE OR REPLACE FUNCTION category_tree_json()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(category_node(c.id) ORDER BY c.sort_order, c.name),
    '[]'::jsonb
  )
  FROM categories c
  WHERE c.parent_id IS NULL;
$$;
