"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";

export function ClearDataButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ postings: number; patterns: number } | null>(null);

  async function handleClear() {
    if (
      !confirm(
        "This will permanently delete ALL job postings and skill patterns.\n\nSources will be kept. This cannot be undone.\n\nContinue?"
      )
    )
      return;

    setStatus("loading");
    try {
      const res = await fetch("/api/clear-data", { method: "DELETE" });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json() as { deleted: { postings: number; patterns: number } };
      setResult(data.deleted);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClear}
        disabled={status === "loading"}
        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500 border border-red-500/30 hover:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 hover:text-white text-sm font-medium rounded-lg transition-colors"
      >
        {status === "loading"
          ? <Loader2 size={14} className="animate-spin" />
          : <Trash2  size={14} />}
        {status === "loading" ? "Clearing…" : "Clear All Data"}
      </button>

      {status === "done" && result && (
        <p className="text-green-400 text-sm">
          Cleared {result.postings.toLocaleString()} postings and {result.patterns.toLocaleString()} patterns.
        </p>
      )}
      {status === "error" && (
        <p className="text-red-400 text-sm">Something went wrong — try again.</p>
      )}
    </div>
  );
}
