import { NextRequest } from "next/server";
import { getSessionUser, isAdmin } from "@/lib/auth/session";
import { jsonOk, jsonError } from "@/lib/api-response";
import {
  cancelSuperhomeImport,
  getImportState,
  runSuperhomeImportStep,
  startSuperhomeImport,
} from "@/lib/import/import-run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const state = await getImportState();
  return jsonOk({ state });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return jsonError("FORBIDDEN", "Admin only", 403);

  const body = (await req.json().catch(() => ({}))) as { action?: string };

  try {
    if (body.action === "start") {
      const state = await startSuperhomeImport();
      return jsonOk({ state });
    }
    if (body.action === "step") {
      const state = await runSuperhomeImportStep();
      return jsonOk({ state });
    }
    if (body.action === "cancel") {
      await cancelSuperhomeImport();
      const state = await getImportState();
      return jsonOk({ state });
    }
    return jsonError("VALIDATION", "action must be start, step, or cancel", 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    const state = await getImportState();
    return jsonError("IMPORT_ERROR", message, 500, { state });
  }
}
