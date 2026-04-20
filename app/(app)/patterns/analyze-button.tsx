"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

function formatLastAnalyzed(iso: string | null | undefined): string {
  if (!iso) return "Never analyzed";
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60) return `Last analyzed ${mins}m ago`;
  if (hours < 24) return `Last analyzed ${hours}h ago`;
  return `Last analyzed ${days}d ago`;
}

export function AnalyzeButton({ lastAnalyzed }: { lastAnalyzed?: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleRefresh() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analysis", { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? "Analysis failed");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed — try again");
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {loading
            ? <Loader2   size={14} className="animate-spin" />
            : <RefreshCw size={14} />}
          {loading ? "Analyzing…" : "Refresh Analysis"}
        </button>
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>
      <span className="text-xs text-fg3">{formatLastAnalyzed(lastAnalyzed)}</span>
    </div>
  );
}
