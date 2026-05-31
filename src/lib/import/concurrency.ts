/** Run async work with a fixed concurrency limit (parallel I/O, not OS threads). */
export async function runPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

export function importConcurrency() {
  const categories = Math.max(
    1,
    Math.min(12, parseInt(process.env.SUPERHOME_IMPORT_CATEGORY_CONCURRENCY ?? "5", 10) || 5)
  );
  const pages = Math.max(
    1,
    Math.min(16, parseInt(process.env.SUPERHOME_IMPORT_PAGE_CONCURRENCY ?? "8", 10) || 8)
  );
  const products = Math.max(
    1,
    Math.min(8, parseInt(process.env.SUPERHOME_IMPORT_PRODUCT_CONCURRENCY ?? "4", 10) || 4)
  );
  return { categories, pages, products };
}
