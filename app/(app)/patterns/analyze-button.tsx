"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function AnalyzeButton() {
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
    <div className="flex items-center gap-2">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg border border-gray-700 transition-colors"
      >
        {loading
          ? <Loader2  size={14} className="animate-spin" />
          : <RefreshCw size={14} />}
        {loading ? "Analyzing…" : "Refresh Analysis"}
      </button>
      {error && <span className="text-red-400 text-sm">{error}</span>}
    </div>
  );
}
