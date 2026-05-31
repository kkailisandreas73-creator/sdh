import { cleanupCatalog } from "@/lib/import/catalog-cleanup";
import {
  discoverCategoryPaths,
  emptyStats,
  ensureSuperhomePriceList,
  importOneListingPage,
  leafCategoryPaths,
  upsertCategoryTree,
  type ImportStats,
} from "@/lib/import/superhome";
import { query } from "@/lib/db/pool";

export const IMPORT_RUN_ID = "superhome";

export type ImportPhase =
  | "idle"
  | "cleaning"
  | "discovering"
  | "categories"
  | "importing"
  | "done"
  | "error";

export type ImportRunState = {
  id: string;
  status: "idle" | "running" | "done" | "error";
  phase: ImportPhase;
  message: string;
  allPaths: string[][];
  leafPaths: string[][];
  leafIndex: number;
  pageNum: number;
  maxPage: number;
  stats: ImportStats;
  error: string | null;
  updatedAt: string;
};

type RunRow = {
  id: string;
  status: string;
  phase: string | null;
  message: string | null;
  all_paths: string[][] | null;
  leaf_paths: string[][] | null;
  leaf_index: number;
  page_num: number;
  max_page: number;
  stats: ImportStats | null;
  error: string | null;
  updated_at: Date;
};

let tableReady: Promise<void> | null = null;

export async function ensureImportTable() {
  if (!tableReady) {
    tableReady = query(`
      CREATE TABLE IF NOT EXISTS catalog_import_runs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'idle',
        phase TEXT,
        message TEXT,
        all_paths JSONB,
        leaf_paths JSONB,
        leaf_index INTEGER NOT NULL DEFAULT 0,
        page_num INTEGER NOT NULL DEFAULT 1,
        max_page INTEGER NOT NULL DEFAULT 1,
        stats JSONB NOT NULL DEFAULT '{}',
        error TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).then(() => undefined);
  }
  await tableReady;
}

function rowToState(row: RunRow | undefined): ImportRunState {
  if (!row) {
    return {
      id: IMPORT_RUN_ID,
      status: "idle",
      phase: "idle",
      message: "No import has been run yet.",
      allPaths: [],
      leafPaths: [],
      leafIndex: 0,
      pageNum: 1,
      maxPage: 1,
      stats: emptyStats(),
      error: null,
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    id: row.id,
    status: row.status as ImportRunState["status"],
    phase: (row.phase ?? "idle") as ImportPhase,
    message: row.message ?? "",
    allPaths: row.all_paths ?? [],
    leafPaths: row.leaf_paths ?? [],
    leafIndex: row.leaf_index,
    pageNum: row.page_num,
    maxPage: row.max_page,
    stats: { ...emptyStats(), ...(row.stats ?? {}) },
    error: row.error,
    updatedAt: row.updated_at.toISOString(),
  };
}

export function computeProgress(state: ImportRunState): number {
  if (state.status === "done") return 100;
  if (state.status === "idle") return 0;
  if (state.phase === "cleaning") return 2;
  if (state.phase === "discovering") return 8;
  if (state.phase === "categories") return 12;
  if (state.leafPaths.length === 0) return 15;
  const leaf = state.leafIndex;
  const pageFrac = state.maxPage > 0 ? (state.pageNum - 1) / state.maxPage : 0;
  return Math.min(99, Math.round(15 + 84 * ((leaf + pageFrac) / state.leafPaths.length)));
}

async function updateRun(updates: {
  status?: string;
  phase?: string;
  message?: string;
  all_paths?: string[][];
  leaf_paths?: string[][];
  leaf_index?: number;
  page_num?: number;
  max_page?: number;
  stats?: ImportStats;
  error?: string | null;
}) {
  await ensureImportTable();
  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [];
  let n = 1;

  for (const [key, val] of Object.entries(updates)) {
    if (val === undefined) continue;
    if (key === "all_paths" || key === "leaf_paths" || key === "stats") {
      sets.push(`${key} = $${n++}`);
      params.push(JSON.stringify(val));
    } else {
      sets.push(`${key} = $${n++}`);
      params.push(val);
    }
  }
  params.push(IMPORT_RUN_ID);

  await query(
    `UPDATE catalog_import_runs SET ${sets.join(", ")} WHERE id = $${n}`,
    params
  );
}

async function getRunRow(): Promise<RunRow | undefined> {
  await ensureImportTable();
  const { rows } = await query<RunRow>(
    `SELECT id, status, phase, message, all_paths, leaf_paths, leaf_index, page_num, max_page, stats, error, updated_at
     FROM catalog_import_runs WHERE id = $1`,
    [IMPORT_RUN_ID]
  );
  return rows[0];
}

export async function getImportState(): Promise<ImportRunState & { progress: number }> {
  const state = rowToState(await getRunRow());
  return { ...state, progress: computeProgress(state) };
}

export async function startSuperhomeImport(): Promise<ImportRunState & { progress: number }> {
  await ensureImportTable();
  const existing = await getRunRow();
  if (existing?.status === "running") {
    throw new Error("An import is already running.");
  }

  const stats = emptyStats();

  await query(
    `INSERT INTO catalog_import_runs (id, status, phase, message, leaf_index, page_num, max_page, stats, updated_at)
     VALUES ($1, 'running', 'cleaning', 'Removing all products and categories…', 0, 1, 1, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET
       status = 'running', phase = 'cleaning', message = 'Removing all products and categories…',
       leaf_index = 0, page_num = 1, max_page = 1, stats = $2, error = NULL, updated_at = NOW()`,
    [IMPORT_RUN_ID, JSON.stringify(stats)]
  );

  try {
    await cleanupCatalog();
    await updateRun({
      phase: "discovering",
      message: "Fetching category list from superhome.com.cy…",
    });

    const allPaths = await discoverCategoryPaths();
    const leaves = leafCategoryPaths(allPaths);

    await updateRun({
      phase: "categories",
      message: `Building category tree (${allPaths.length} categories)…`,
      all_paths: allPaths,
      leaf_paths: leaves,
    });

    await ensureSuperhomePriceList();
    const cache = new Map<string, string>();
    await upsertCategoryTree(allPaths, cache);

    await updateRun({
      phase: "importing",
      message: `Importing products (0 / ${leaves.length} categories)…`,
      leaf_index: 0,
      page_num: 1,
      max_page: 1,
    });

    return getImportState();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Import failed";
    await updateRun({ status: "error", phase: "error", message: msg, error: msg });
    throw e;
  }
}

export async function runSuperhomeImportStep(): Promise<ImportRunState & { progress: number }> {
  const row = await getRunRow();
  if (!row || row.status !== "running") {
    return getImportState();
  }

  const leafPaths = row.leaf_paths ?? [];
  let leafIndex = row.leaf_index;
  let pageNum = row.page_num;
  let maxPage = row.max_page;
  const stats = { ...emptyStats(), ...(row.stats ?? {}) };
  const cache = new Map<string, string>();

  if (leafIndex >= leafPaths.length) {
    await updateRun({
      status: "done",
      phase: "done",
      message: `Import complete. ${stats.productsUpserted} products imported.`,
    });
    return getImportState();
  }

  const segments = leafPaths[leafIndex];
  const pathLabel = segments.join("/");

  try {
    await updateRun({
      message: `Importing ${pathLabel} (page ${pageNum}${maxPage > 1 ? ` of ${maxPage}` : ""}) — category ${leafIndex + 1} / ${leafPaths.length}`,
    });

    const result = await importOneListingPage(segments, pageNum, cache, stats);
    if (pageNum === 1) maxPage = result.maxPage;

    if (pageNum < maxPage) {
      pageNum += 1;
    } else {
      stats.categoriesDone += 1;
      leafIndex += 1;
      pageNum = 1;
      maxPage = 1;
    }

    const done = leafIndex >= leafPaths.length;
    await updateRun({
      status: done ? "done" : "running",
      phase: done ? "done" : "importing",
      message: done
        ? `Import complete. ${stats.productsUpserted} products imported.`
        : `Imported ${pathLabel} — ${stats.productsUpserted} products so far (${leafIndex} / ${leafPaths.length} categories)`,
      leaf_index: leafIndex,
      page_num: pageNum,
      max_page: maxPage,
      stats,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Step failed";
    stats.categoriesFailed += 1;
    leafIndex += 1;
    pageNum = 1;
    maxPage = 1;
    await updateRun({
      message: `Skipped ${pathLabel}: ${msg}`,
      leaf_index: leafIndex,
      page_num: pageNum,
      max_page: maxPage,
      stats,
    });
  }

  return getImportState();
}

export async function cancelSuperhomeImport() {
  await ensureImportTable();
  await updateRun({
    status: "idle",
    phase: "idle",
    message: "Import cancelled.",
    error: null,
  });
}
