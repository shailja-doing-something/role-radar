"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, MapPin, DollarSign, ExternalLink,
  Wifi, Filter, X, Target,
} from "lucide-react";

interface Posting {
  id:        number;
  title:     string;
  company:   string;
  location:  string | null;
  remote:    boolean;
  salary:    string | null;
  source:    string;
  url:       string;
  postedAt:  string | null;
  createdAt: string;
  isTop100:  boolean;
}

interface ApiResponse {
  postings: Posting[];
  total:    number;
  page:     number;
  limit:    number;
}

const LIMIT = 50;

export default function PostingsPage() {
  const searchParams = useSearchParams();

  const [data,       setData]       = useState<ApiResponse | null>(null);
  const [loading,    setLoading]    = useState(true);
  // Initialise from URL params so Top100 "View roles" links land pre-filtered
  const [q,          setQ]          = useState(searchParams.get("company") ?? "");
  const [source,     setSource]     = useState("");
  const [remote,     setRemote]     = useState("");
  const [top100Only, setTop100Only] = useState(searchParams.get("top100Only") === "true");
  const [page,       setPage]       = useState(1);
  const [sources,    setSources]    = useState<string[]>([]);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page:  String(page),
      limit: String(LIMIT),
      ...(q          ? { q }                       : {}),
      ...(source     ? { source }                  : {}),
      ...(remote     ? { remote }                  : {}),
      ...(top100Only ? { top100Only: "true" }      : {}),
    });
    const res  = await fetch(`/api/postings?${params}`);
    const json = await res.json() as ApiResponse;
    setData(json);
    setLoading(false);
  }, [q, source, remote, top100Only, page]);

  useEffect(() => { fetch_(); }, [fetch_]);

  useEffect(() => {
    fetch("/api/sources")
      .then((r) => r.json())
      .then((boards) => setSources((boards as { slug: string }[]).map((b) => b.slug)));
  }, []);

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;
  const hasFilters = q || source || remote || top100Only;

  function clearFilters() {
    setQ(""); setSource(""); setRemote(""); setTop100Only(false); setPage(1);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          Job Postings
          {data && (
            <span className="text-gray-500 text-base font-normal ml-3">
              {data.total.toLocaleString()} results
            </span>
          )}
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={15} className="text-gray-500 shrink-0" />
          <input
            className="bg-transparent text-white text-sm placeholder-gray-500 outline-none w-full"
            placeholder="Search title or company…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>

        {/* Source */}
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
          <Filter size={13} className="text-gray-500" />
          <select
            className="bg-transparent text-sm text-gray-300 outline-none"
            value={source}
            onChange={(e) => { setSource(e.target.value); setPage(1); }}
          >
            <option value="">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s} className="bg-gray-900">{s}</option>
            ))}
          </select>
        </div>

        {/* Remote */}
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
          <Wifi size={13} className="text-gray-500" />
          <select
            className="bg-transparent text-sm text-gray-300 outline-none"
            value={remote}
            onChange={(e) => { setRemote(e.target.value); setPage(1); }}
          >
            <option value="">All types</option>
            <option value="true"  className="bg-gray-900">Remote only</option>
            <option value="false" className="bg-gray-900">On-site only</option>
          </select>
        </div>

        {/* Target Accounts toggle */}
        <button
          type="button"
          onClick={() => { setTop100Only((v) => !v); setPage(1); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
            top100Only
              ? "bg-amber-950/40 border-amber-700/50 text-amber-400"
              : "bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-300 hover:border-gray-700"
          }`}
        >
          <Target size={13} />
          Target Accounts Only
        </button>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors px-3"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data?.postings.length ? (
          <div className="text-center py-16 text-gray-500">No postings match your filters.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-500 font-medium px-6 py-3">Role</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">Company</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">Location</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">Salary</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">Source</th>
                <th className="text-left text-gray-500 font-medium px-4 py-3">Posted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {data.postings.map((p) => (
                <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-200 font-medium truncate max-w-56">{p.title}</span>
                      {p.remote && (
                        <span className="shrink-0 text-xs bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">
                          Remote
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 truncate max-w-32">
                      <span className="text-gray-400 truncate">{p.company}</span>
                      {p.isTop100 && (
                        <span title="Top 100 target account">
                          <Target size={11} className="text-amber-400 shrink-0" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.location ? (
                      <span className="flex items-center gap-1 text-gray-400">
                        <MapPin size={11} className="shrink-0" />{p.location}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.salary ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <DollarSign size={11} className="shrink-0" />
                        {p.salary.slice(0, 22)}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                      {p.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {p.postedAt
                      ? new Date(p.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-blue-400 transition-colors"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-gray-500 text-sm">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-800 rounded-lg text-gray-300 hover:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-800 rounded-lg text-gray-300 hover:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
