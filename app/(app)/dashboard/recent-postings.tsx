"use client";

import { useState, useEffect } from "react";
import { Target, ExternalLink, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Posting {
  id:        number;
  title:     string;
  company:   string;
  location:  string | null;
  remote:    boolean;
  salary:    string | null;
  url:       string;
  source:    string;
  postedAt:  string | null;
  createdAt: string;
  isTop100:  boolean;
}

const SOURCE_LABEL: Record<string, string> = {
  linkedin:         "LinkedIn",
  indeed:           "Indeed",
  ziprecruiter:     "ZipRecruiter",
  glassdoor:        "Glassdoor",
  website:          "Web",
  brokerage_portal: "Portal",
};

function roleClasses(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("inside sales") || /\bisa\b/.test(t))
    return "bg-indigo-500/15 text-indigo-400";
  if (t.includes("marketing"))
    return "bg-purple-500/15 text-purple-400";
  if (t.includes("operations") || t.includes("admin") || t.includes("manager"))
    return "bg-blue-500/15 text-blue-400";
  if (t.includes("transaction") || t.includes("coordinator") || t.includes("listing"))
    return "bg-green-500/15 text-green-400";
  return "bg-surface-raised text-fg2";
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff  = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (hours < 1)  return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  if (days < 30)  return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function RecentPostings() {
  const [top100Only, setTop100Only] = useState(false);
  const [postings,   setPostings]   = useState<Posting[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: "10",
      ...(top100Only ? { top100Only: "true" } : {}),
    });
    fetch(`/api/postings?${params}`)
      .then((r) => r.json())
      .then((data: { postings: Posting[] }) => {
        setPostings(data.postings ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [top100Only]);

  return (
    <div className="bg-surface border border-edge rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg2 mb-0.5">
            Recent Postings
          </p>
          <p className="text-xs text-fg3">Latest 10 from all sources</p>
        </div>
        <button
          type="button"
          onClick={() => setTop100Only((v) => !v)}
          className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
            top100Only
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "border-edge text-fg3 hover:bg-surface-raised hover:text-fg2"
          }`}
        >
          <Target size={11} />
          Target Only
        </button>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="space-y-3 pt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-28 rounded-full shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-3 w-10 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && postings.length === 0 && (
        <div className="py-10 text-center">
          <p className="text-fg3 text-sm">
            {top100Only
              ? "No target account postings yet"
              : "No postings yet — run a scrape"}
          </p>
        </div>
      )}

      {/* List */}
      {!loading && postings.length > 0 && (
        <div className="divide-y divide-edge -mx-6">
          {postings.map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 py-2.5 px-6 hover:bg-surface-raised transition-colors"
            >
              {/* Role badge */}
              <span
                className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleClasses(p.title)}`}
              >
                {p.title.length > 20 ? p.title.slice(0, 20) + "…" : p.title}
              </span>

              {/* Company + meta */}
              <div className="flex-1 min-w-0">
                <span className="text-sm text-white font-medium truncate block group-hover:text-indigo-300 transition-colors">
                  {p.company}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  {p.location && (
                    <span className="flex items-center gap-0.5 text-[11px] text-fg3">
                      <MapPin size={9} />
                      {p.location.length > 18 ? p.location.slice(0, 18) + "…" : p.location}
                    </span>
                  )}
                  <span className="text-[11px] text-fg3">
                    {SOURCE_LABEL[p.source] ?? p.source}
                  </span>
                </div>
              </div>

              {/* Right meta */}
              <div className="flex items-center gap-1.5 shrink-0">
                {p.isTop100 && <Target size={10} className="text-amber-400" />}
                <span className="text-[11px] text-fg3">
                  {timeAgo(p.postedAt ?? p.createdAt)}
                </span>
                <ExternalLink
                  size={11}
                  className="text-fg3 group-hover:text-fg2 transition-colors"
                />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
