"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ImportStats = {
  productsUpserted: number;
  productsFailed: number;
  productsSkipped: number;
  categoriesDone: number;
  categoriesFailed: number;
};

type ImportState = {
  status: "idle" | "running" | "done" | "error" | "cancelled";
  phase: string;
  message: string;
  progress: number;
  leafIndex: number;
  leafPaths: string[][];
  pageNum: number;
  maxPage: number;
  stats: ImportStats;
  error: string | null;
  updatedAt: string;
};

const emptyStats = (): ImportStats => ({
  productsUpserted: 0,
  productsFailed: 0,
  productsSkipped: 0,
  categoriesDone: 0,
  categoriesFailed: 0,
});

function shouldStopLoop(status: ImportState["status"] | undefined) {
  return (
    status === "done" ||
    status === "error" ||
    status === "idle" ||
    status === "cancelled"
  );
}

export function SuperhomeImportPanel() {
  const [state, setState] = useState<ImportState | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const runningRef = useRef(false);
  const cancelRequestedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const appendLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-80), `${new Date().toLocaleTimeString()} — ${msg}`]);
  }, []);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch("/api/v1/admin/import/superhome", { signal });
    if (!res.ok) return;
    const data = await res.json();
    if (data.state) setState(data.state);
  }, []);

  const runSteps = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    cancelRequestedRef.current = false;
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      while (!cancelRequestedRef.current) {
        const res = await fetch("/api/v1/admin/import/superhome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "step" }),
          signal,
        });
        const data = await res.json();
        const next = data.state as ImportState | undefined;
        if (next) {
          setState(next);
          if (next.message) appendLog(next.message);
        }
        if (
          cancelRequestedRef.current ||
          signal.aborted ||
          !res.ok ||
          shouldStopLoop(next?.status)
        ) {
          break;
        }
        await new Promise((r) => setTimeout(r, 80));
        if (cancelRequestedRef.current || signal.aborted) break;
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        appendLog("Import loop stopped.");
      } else {
        appendLog(e instanceof Error ? e.message : "Step failed");
      }
    } finally {
      runningRef.current = false;
      setBusy(false);
      abortRef.current = null;
    }
  }, [appendLog]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleStart() {
    if (
      !confirm(
        "This will delete ALL products, categories, carts, quotes, and orders, then import from superhome.com.cy. Continue?"
      )
    ) {
      return;
    }
    cancelRequestedRef.current = false;
    setBusy(true);
    setLog([]);
    appendLog("Clearing catalog…");
    try {
      const res = await fetch("/api/v1/admin/import/superhome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      let data: { state?: ImportState; error?: { message?: string; details?: { state?: ImportState } } };
      try {
        data = await res.json();
      } catch {
        appendLog(res.ok ? "Invalid response from server" : `Start failed (${res.status})`);
        setBusy(false);
        return;
      }
      if (!res.ok) {
        appendLog(data.error?.message ?? `Start failed (${res.status})`);
        if (data.error?.details?.state) setState(data.error.details.state);
        setBusy(false);
        return;
      }
      const next = data.state as ImportState | undefined;
      if (next) {
        setState(next);
        appendLog(next.message);
      }
      if (next?.status === "running" && !cancelRequestedRef.current) {
        appendLog("Continuing with category discovery and product import…");
        await runSteps();
      } else {
        appendLog(next?.status ? `Import did not start (status: ${next.status})` : "No import state returned");
        setBusy(false);
      }
    } catch (e) {
      appendLog(e instanceof Error ? e.message : "Start failed");
      setBusy(false);
    }
  }

  async function handleCancel() {
    cancelRequestedRef.current = true;
    runningRef.current = false;
    abortRef.current?.abort();
    setBusy(false);
    try {
      await fetch("/api/v1/admin/import/superhome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      await refresh();
      appendLog("Cancelled.");
    } catch (e) {
      appendLog(e instanceof Error ? e.message : "Cancel failed");
    }
  }

  const stats = state?.stats ?? emptyStats();
  const progress = state?.progress ?? 0;
  const isRunning =
    (state?.status === "running" || busy) && state?.status !== "cancelled";

  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-sm text-slate-600">
        Imports categories and products from{" "}
        <a
          href="https://superhome.com.cy/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#c41e3a] underline"
        >
          superhome.com.cy
        </a>
        . Before import, <strong>all products and categories</strong> are removed (including carts,
        quotes, and orders).
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleStart}
          disabled={isRunning}
          className="rounded bg-[#c41e3a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isRunning ? "Importing…" : "Start import"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={!isRunning && state?.status !== "running"}
          className="rounded border px-4 py-2 text-sm disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            cancelRequestedRef.current = false;
            setBusy(true);
            appendLog("Resuming import…");
            runSteps();
          }}
          disabled={isRunning || state?.status !== "running"}
          className="rounded border px-4 py-2 text-sm disabled:opacity-50"
        >
          Resume
        </button>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={isRunning}
          className="rounded border px-4 py-2 text-sm disabled:opacity-50"
        >
          Refresh status
        </button>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-medium capitalize">{state?.phase ?? "idle"}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-[#1e3a5f] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-600">{state?.message ?? "—"}</p>
        {state?.error && <p className="mt-1 text-sm text-red-600">{state.error}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 rounded border bg-white p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-slate-500">Products imported</p>
          <p className="text-lg font-semibold">{stats.productsUpserted}</p>
        </div>
        <div>
          <p className="text-slate-500">Products failed</p>
          <p className="text-lg font-semibold">{stats.productsFailed}</p>
        </div>
        <div>
          <p className="text-slate-500">Categories done</p>
          <p className="text-lg font-semibold">
            {stats.categoriesDone}
            {state?.leafPaths?.length ? ` / ${state.leafPaths.length}` : ""}
          </p>
        </div>
      </div>

      {log.length > 0 && (
        <div className="rounded border bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Activity log</p>
          <ul className="max-h-48 space-y-1 overflow-y-auto font-mono text-xs text-slate-700">
            {log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
