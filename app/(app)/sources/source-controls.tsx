"use client";

import { useState } from "react";
import { RefreshCw, Power, PowerOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  id:     number;
  slug:   string;
  active: boolean;
}

export function SourceControls({ id, slug, active }: Props) {
  const [scraping, setScraping] = useState(false);
  const [toggling, setToggling] = useState(false);
  const router = useRouter();

  async function handleScrape() {
    setScraping(true);
    try {
      await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      router.refresh();
    } finally {
      setScraping(false);
    }
  }

  async function handleToggle() {
    setToggling(true);
    try {
      await fetch(`/api/sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      router.refresh();
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {active ? (
        <>
          <button
            type="button"
            onClick={handleScrape}
            disabled={scraping}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-fg2 hover:text-ink hover:bg-surface-raised disabled:opacity-30 transition-colors"
          >
            {scraping
              ? <Loader2  size={12} className="animate-spin" />
              : <RefreshCw size={12} />}
            {scraping ? "Scraping…" : "Scrape"}
          </button>
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggling}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-fg3 hover:text-[var(--danger)] hover:bg-surface-raised disabled:opacity-30 transition-colors"
          >
            <PowerOff size={12} />
            {toggling ? "Disabling…" : "Disable"}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-soft text-primary hover:bg-primary hover:text-white disabled:opacity-30 transition-colors border border-primary-muted"
        >
          <Power size={12} />
          {toggling ? "Enabling…" : "Enable"}
        </button>
      )}
    </div>
  );
}
