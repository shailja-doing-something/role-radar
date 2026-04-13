"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Loader2, CheckCircle, XCircle } from "lucide-react";

type Status = "idle" | "running" | "success" | "error";

export function ScrapeButton() {
  const [status,  setStatus]  = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);

  const clearReset = () => {
    if (resetRef.current) { clearTimeout(resetRef.current); resetRef.current = null; }
  };

  const scheduleReset = useCallback((ms = 5000) => {
    clearReset();
    resetRef.current = setTimeout(() => { setStatus("idle"); setMessage(""); }, ms);
  }, []);

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
          setStatus("success");
          setMessage("Scrape complete");
          scheduleReset(5000);
        }
      } catch {
        // transient network error — keep polling
      }
    }, 3000);
  }, [stopPolling, scheduleReset]);

  // On mount: if a scrape is already in progress (e.g. triggered by scheduler),
  // reflect that immediately so the button shows the right state.
  useEffect(() => {
    fetch("/api/scrape/status")
      .then((r) => r.json() as Promise<{ running: boolean }>)
      .then(({ running }) => { if (running) { setStatus("running"); startPolling(); } })
      .catch(() => {});

    return () => { stopPolling(); clearReset(); };
  }, [startPolling, stopPolling]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleClick() {
    if (status === "running") return;
    clearReset();
    setStatus("running");
    setMessage("");

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const secret = process.env.NEXT_PUBLIC_CRON_SECRET;
      if (secret) headers["Authorization"] = `Bearer ${secret}`;

      const res  = await fetch("/api/scrape/trigger", { method: "POST", headers });
      const data = await res.json().catch(() => ({})) as { error?: string };

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Scrape trigger failed");
        scheduleReset(6000);
      } else {
        // Poll until the scraper finishes (may take several minutes)
        startPolling();
      }
    } catch {
      setStatus("error");
      setMessage("Network error — try again");
      scheduleReset(6000);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "running"}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {status === "running"
          ? <Loader2 size={15} className="animate-spin" />
          : <Play    size={15} />}
        {status === "running" ? "Scraping…" : "Run Scrape Now"}
      </button>

      {status === "running" && (
        <span className="text-gray-400 text-sm animate-pulse">
          Running — may take a few minutes
        </span>
      )}
      {status === "success" && (
        <span className="flex items-center gap-1.5 text-green-400 text-sm">
          <CheckCircle size={14} /> {message}
        </span>
      )}
      {status === "error" && (
        <span className="flex items-center gap-1.5 text-red-400 text-sm">
          <XCircle size={14} /> {message}
        </span>
      )}
    </div>
  );
}
