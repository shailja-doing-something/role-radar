"use client";

import { useState } from "react";
import { RefreshCw, Power } from "lucide-react";
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
      <button
        onClick={handleScrape}
        disabled={scraping || !active}
        title="Scrape now"
        className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 disabled:opacity-30 transition-colors"
      >
        <RefreshCw size={15} className={scraping ? "animate-spin" : ""} />
      </button>
      <button
        onClick={handleToggle}
        disabled={toggling}
        title={active ? "Deactivate" : "Activate"}
        className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${
          active
            ? "text-green-400 hover:text-white hover:bg-gray-800"
            : "text-gray-600 hover:text-white hover:bg-gray-800"
        }`}
      >
        <Power size={15} />
      </button>
    </div>
  );
}
