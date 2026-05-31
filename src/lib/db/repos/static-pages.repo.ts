import { query } from "../pool";
import { mapStaticPage } from "../mappers";

export async function findStaticPageBySlug(slug: string) {
  const { rows } = await query(`SELECT * FROM static_pages WHERE slug = $1`, [slug]);
  return rows[0] ? mapStaticPage(rows[0]) : null;
}
