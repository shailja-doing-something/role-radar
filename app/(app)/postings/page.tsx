"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, MapPin, DollarSign, ExternalLink,
  Wifi, Filter, X, Target, Briefcase,
} from "lucide-react";

interface Posting {
  id:                number;
  title:             string;
  company:           string;
  location:          string | null;
  remote:            boolean;
  salary:            string | null;
  source:            string;
  url:               string;
  postedAt:          string | null;
  createdAt:         string;
  isTop100:          boolean;
}

interface ApiResponse {
  postings: Posting[];
  total:    number;
  page:     number;
  limit:    number;
}

const LIMIT = 50;

function roleAccent(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("inside sales") || t.startsWith("isa")) return "text-primary";
  if (t.includes("market")) return "text-fg2";
  if (t.includes("ops") || t.includes("operat")) return "text-fg2";
  if (t.includes("transaction") || t.includes("tc")) return "text-[var(--success)]";
  return "text-ink";
}

function FilterPill({
  icon: Icon,
  children,
  active = false,
}: {
  icon:      React.ElementType;
  children:  React.ReactNode;
  active?:   boolean;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition-colors ${
      active
        ? "bg-primary-soft border-primary-muted text-primary"
        : "bg-surface border-edge"
    }`}>
      <Icon size={13} className={active ? "text-primary" : "text-fg3"} />
      {children}
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-edge last:border-0">
          <td className="px-5 py-3.5"><div className="skeleton h-4 w-48 rounded" /></td>
          <td className="px-4 py-3.5"><div className="skeleton h-4 w-28 rounded" /></td>
          <td className="px-4 py-3.5"><div className="skeleton h-4 w-24 rounded" /></td>
          <td className="px-4 py-3.5"><div className="skeleton h-4 w-20 rounded" /></td>
          <td className="px-4 py-3.5"><div className="skeleton h-5 w-16 rounded-full" /></td>
          <td className="px-4 py-3.5"><div className="skeleton h-4 w-12 rounded" /></td>
          <td className="px-4 py-3.5" />
        </tr>
      ))}
    </>
  );
}

export default function PostingsPage() {
  const searchParams = useSearchParams();

  const [data,       setData]       = useState<ApiResponse | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [q,          setQ]          = useState(searchParams.get("company") ?? "");
  const [source,     setSource]     = useState("");
  const [remote,     setRemote]     = useState("");
  const [top100Only,    setTop100Only]    = useState(searchParams.get("top100Only") === "true");
  const [priorityOnly,  setPriorityOnly]  = useState(false);
  const [page,       setPage]       = useState(1);
  const [sources,    setSources]    = useState<string[]>([]);

  const doFetch = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page:  String(page),
      limit: String(LIMIT),
      ...(q          ? { q }                  : {}),
      ...(source     ? { source }             : {}),
      ...(remote     ? { remote }             : {}),
      ...(top100Only   ? { top100Only:   "true" } : {}),
      ...(priorityOnly ? { priorityOnly: "true" } : {}),
    });
    const res  = await fetch(`/api/postings?${params}`);
    const json = await res.json() as ApiResponse;
    setData(json);
    console.log(`[Postings] API response: total=${json.total}, postings=${json.postings?.length ?? 0}`);
    setLoading(false);
  }, [q, source, remote, top100Only, priorityOnly, page]);

  useEffect(() => { doFetch(); }, [doFetch]);

  useEffect(() => {
    fetch("/api/sources")
      .then((r) => r.json())
      .then((boards) => setSources((boards as { slug: string }[]).map((b) => b.slug)));
  }, []);

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;
  const hasFilters = q || source || remote || top100Only || priorityOnly;

  function clearFilters() {
    setQ(""); setSource(""); setRemote(""); setTop100Only(false); setPriorityOnly(false); setPage(1);
  }

  return (
    <div className="px-10 pt-10 pb-16 max-w-[1280px] mx-auto">

      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Briefcase size={20} className="text-primary" />
            <h1 className="text-2xl font-semibold text-ink">
              Postings
              {data && (
                <span className="text-fg3 text-base font-normal ml-3">
                  {data.total.toLocaleString()} results
                </span>
              )}
            </h1>
          </div>
          <p className="text-sm text-fg2">All scraped job postings across your configured sources</p>
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="flex items-center gap-2 bg-surface border border-edge rounded-lg px-3 py-2 flex-1 min-w-52">
          <Search size={14} className="text-fg3 shrink-0" />
          <input
            className="bg-transparent text-ink text-sm placeholder-fg3 outline-none w-full"
            placeholder="Search title or company…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
          {q && (
            <button type="button" onClick={() => { setQ(""); setPage(1); }} className="text-fg3 hover:text-ink">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Source */}
        <FilterPill icon={Filter} active={!!source}>
          <select
            className="bg-transparent text-sm outline-none text-fg2"
            value={source}
            onChange={(e) => { setSource(e.target.value); setPage(1); }}
          >
            <option value="" className="bg-surface-raised">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s} className="bg-surface-raised">{s}</option>
            ))}
          </select>
        </FilterPill>

        {/* Remote */}
        <FilterPill icon={Wifi} active={!!remote}>
          <select
            className="bg-transparent text-sm outline-none text-fg2"
            value={remote}
            onChange={(e) => { setRemote(e.target.value); setPage(1); }}
          >
            <option value=""      className="bg-surface-raised">All types</option>
            <option value="true"  className="bg-surface-raised">Remote only</option>
            <option value="false" className="bg-surface-raised">On-site only</option>
          </select>
        </FilterPill>

        {/* Target Accounts */}
        <button
          type="button"
          onClick={() => { setTop100Only((v) => !v); setPage(1); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
            top100Only
              ? "bg-primary-soft border-primary-muted text-primary"
              : "bg-surface border-edge text-fg2 hover:text-ink"
          }`}
        >
          <Target size={13} />
          Target Accounts Only
        </button>

        {/* Priority Accounts */}
        <button
          type="button"
          onClick={() => { setPriorityOnly((v) => !v); setPage(1); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
            priorityOnly
              ? "bg-orange-50 border-orange-300 text-orange-600"
              : "bg-surface border-edge text-fg2 hover:text-ink"
          }`}
        >
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${priorityOnly ? "bg-orange-100 text-orange-600" : "bg-surface-raised text-fg3"}`}>
            P
          </span>
          Priority Only
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-sm text-fg3 hover:text-ink transition-colors px-2"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────────── */}
      <div className="bg-surface border border-edge rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge">
              <th className="text-left px-5 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3">Role</span>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3">Company</span>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3">Location</span>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3">Salary</span>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3">Source</span>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3">Posted</span>
              </th>
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {loading ? (
              <SkeletonRows />
            ) : !data?.postings.length ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-fg3 text-sm">
                  No postings match your filters.
                </td>
              </tr>
            ) : (
              data.postings.map((p) => (
                <tr key={p.id} className="hover:bg-surface-raised transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium truncate max-w-56 ${roleAccent(p.title)}`}>
                        {p.title}
                      </span>
                      {p.remote && (
                        <span className="shrink-0 text-[11px] bg-primary-soft text-primary border border-primary-muted px-1.5 py-0.5 rounded">
                          Remote
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 max-w-36">
                      <span className="text-fg2 truncate">{p.company}</span>
                      {p.isTop100 && (
                        <span title="Target account">
                          <Target size={11} className="text-primary shrink-0" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {p.location ? (
                      <span className="flex items-center gap-1 text-fg2 text-xs">
                        <MapPin size={11} className="text-fg3 shrink-0" />
                        {p.location}
                      </span>
                    ) : (
                      <span className="text-fg3">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {p.salary ? (
                      <span className="flex items-center gap-1 text-[var(--success)] text-xs">
                        <DollarSign size={11} className="shrink-0" />
                        {p.salary.slice(0, 22)}
                      </span>
                    ) : (
                      <span className="text-fg3">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[11px] bg-surface-raised border border-edge text-fg2 px-2 py-0.5 rounded-full">
                      {p.source}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-fg3 text-xs whitespace-nowrap">
                    {p.postedAt
                      ? new Date(p.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fg3 hover:text-primary transition-colors"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-fg3 text-sm">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 text-sm bg-surface border border-edge rounded-lg text-fg2 hover:border-primary-muted hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 text-sm bg-surface border border-edge rounded-lg text-fg2 hover:border-primary-muted hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
