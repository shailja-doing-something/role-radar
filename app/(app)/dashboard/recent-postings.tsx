"use client";

import { useState, useEffect } from "react";
import { Target, ExternalLink, MapPin, DollarSign } from "lucide-react";

interface Posting {
  id:       number;
  title:    string;
  company:  string;
  location: string | null;
  remote:   boolean;
  salary:   string | null;
  url:      string;
  postedAt: string | null;
  isTop100: boolean;
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
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">Recent Postings</h2>
        <button
          type="button"
          onClick={() => setTop100Only((v) => !v)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
            top100Only
              ? "bg-amber-950/40 border-amber-700/50 text-amber-400"
              : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-300"
          }`}
        >
          <Target size={11} />
          Target Accounts Only
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : postings.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {top100Only ? "No target account postings yet — run a scrape." : "No data yet — scrape from Sources."}
        </p>
      ) : (
        <div className="space-y-3">
          {postings.map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-gray-300 text-sm truncate group-hover:text-white transition-colors">
                    {p.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-gray-500 text-xs">{p.company}</span>
                    {p.isTop100 && (
                      <span title="Top 100 target account">
                        <Target size={10} className="text-amber-400 shrink-0" />
                      </span>
                    )}
                    {p.remote && (
                      <span className="text-xs bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">
                        Remote
                      </span>
                    )}
                    {p.location && !p.remote && (
                      <span className="flex items-center gap-0.5 text-gray-500 text-xs">
                        <MapPin size={10} />{p.location}
                      </span>
                    )}
                    {p.salary && (
                      <span className="flex items-center gap-0.5 text-green-400 text-xs">
                        <DollarSign size={10} />{p.salary.slice(0, 20)}
                      </span>
                    )}
                  </div>
                </div>
                <ExternalLink
                  size={13}
                  className="text-gray-600 shrink-0 mt-0.5 group-hover:text-gray-400 transition-colors"
                />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
