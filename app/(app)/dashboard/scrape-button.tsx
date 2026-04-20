"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

type Status = "idle" | "running";

interface LastScrapeRun {
  status:           string;
  errors:           string | null;
  jsearchCallsUsed: number | null;
}

function formatLastScraped(iso: string | null | undefined): string {
  if (!iso) return "Never scraped";
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60) return `Last scraped ${mins}m ago`;
  if (hours < 24) return `Last scraped ${hours}h ago`;
  return `Last scraped ${days}d ago`;
}

export function ScrapeButton({ lastScraped, lastScrapeRun }: { lastScraped?: string | null; lastScrapeRun?: LastScrapeRun | null }) {
  const [status,  setStatus]  = useState<Status>("idle");
  const { toast }             = useToast();
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch("/api/scrape/status");
        const data = await res.json() as { running: boolean };
        if (!data.running) {
          stopPolling();
          setStatus("idle");
          toast("Scrape completed — Dashboard will update on next visit", "success");
        }
      } catch { /* transient — keep polling */ }
    }, 3000);
  }, [stopPolling, toast]);

  useEffect(() => {
    fetch("/api/scrape/status")
      .then((r) => r.json() as Promise<{ running: boolean }>)
      .then(({ running }) => { if (running) { setStatus("running"); startPolling(); } })
      .catch(() => {});
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  async function handleClick() {
    if (status === "running") return;
    setStatus("running");

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const secret = process.env.NEXT_PUBLIC_CRON_SECRET;
      if (secret) headers["Authorization"] = `Bearer ${secret}`;

      const res  = await fetch("/api/scrape/trigger", { method: "POST", headers });
      const data = await res.json().catch(() => ({})) as { error?: string };

      if (!res.ok) {
        setStatus("idle");
        toast(data.error ?? "Scrape failed — check logs", "error");
      } else {
        startPolling();
      }
    } catch {
      setStatus("idle");
      toast("Scrape failed — network error", "error");
    }
  }

  const running = status === "running";

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-3">
        {running && (
          <span className="text-fg2 text-sm animate-pulse">
            Running — may take a few minutes
          </span>
        )}
        <button
          type="button"
          onClick={handleClick}
          disabled={running}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {running
            ? <Loader2 size={14} className="animate-spin" />
            : <Play    size={14} />}
          {running ? "Scraping…" : "Run Scrape Now"}
        </button>
      </div>
      <span className="text-xs text-fg3">{formatLastScraped(lastScraped)}</span>
      {lastScrapeRun && (() => {
        const isQuotaFail = lastScrapeRun.status === "failed" &&
          !!lastScrapeRun.errors &&
          (lastScrapeRun.errors.toLowerCase().includes("quota") ||
           lastScrapeRun.errors.toLowerCase().includes("rate limited"));
        const isPartial = lastScrapeRun.status === "partial";
        return (
          <>
            {isQuotaFail && (
              <span className="text-xs" style={{ color: "#D97706" }}>
                JSearch quota exhausted —{" "}
                <a href="https://rapidapi.com" target="_blank" rel="noopener noreferrer" className="underline">
                  Check usage →
                </a>
              </span>
            )}
            {isPartial && !isQuotaFail && (
              <span className="text-xs text-fg3">
                Last scrape was partial — some teams were rate limited
              </span>
            )}
            {lastScrapeRun.jsearchCallsUsed != null && (
              <span className="text-[11px] text-fg3">
                Last run used {lastScrapeRun.jsearchCallsUsed} of ~200 monthly calls
              </span>
            )}
          </>
        );
      })()}
    </div>
  );
}
