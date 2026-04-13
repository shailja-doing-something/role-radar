"use client";

import { useState } from "react";
import { RefreshCw, Power, PowerOff } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  id: number;
  slug: string;
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
            onClick={handleScrape}
            disabled={scraping}
            title="Scrape now"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 transition-colors"
          >
            <RefreshCw size={13} className={scraping ? "animate-spin" : ""} />
            {scraping ? "Scraping…" : "Scrape"}
          </button>
          <button
            onClick={handleToggle}
            disabled={toggling}
            title="Disable source"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-gray-800 disabled:opacity-30 transition-colors"
          >
            <PowerOff size={13} />
            Disable
          </button>
        </>
      ) : (
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white disabled:opacity-30 transition-colors border border-blue-800 hover:border-blue-600"
        >
          <Power size={13} />
          {toggling ? "Enabling…" : "Enable"}
        </button>
      )}
    </div>
  );
}
