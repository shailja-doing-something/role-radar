"use client";

import { useState } from "react";
import { Play, Loader2, CheckCircle, XCircle } from "lucide-react";

type Status = "idle" | "running" | "success" | "error";

export function ScrapeButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleClick() {
    if (status === "running") return;
    setStatus("running");
    setMessage("");

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const secret = process.env.NEXT_PUBLIC_CRON_SECRET;
      if (secret) headers["Authorization"] = `Bearer ${secret}`;

      const res = await fetch("/api/scrape/trigger", { method: "POST", headers });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Scrape failed");
      } else {
        setStatus("success");
        setMessage("Scrape started — this takes a few minutes");
      }
    } catch {
      setStatus("error");
      setMessage("Network error — try again");
    }

    // Reset to idle after 6 s
    setTimeout(() => {
      setStatus("idle");
      setMessage("");
    }, 6000);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "running"}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {status === "running" ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Play size={15} />
        )}
        {status === "running" ? "Running…" : "Run Scrape Now"}
      </button>

      {status === "success" && (
        <span className="flex items-center gap-1.5 text-green-400 text-sm">
          <CheckCircle size={14} />
          {message}
        </span>
      )}
      {status === "error" && (
        <span className="flex items-center gap-1.5 text-red-400 text-sm">
          <XCircle size={14} />
          {message}
        </span>
      )}
    </div>
  );
}
