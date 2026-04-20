"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, ExternalLink, Search, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveLabel, StaticLabel } from "@/components/source-labels";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ISASignal {
  id:             number;
  normalizedRole: string;
  location:       string | null;
  source:         string;
  sourceUrl:      string;
  postedAt:       string | null;
}

interface TeamSignal {
  id:                    number;
  name:                  string;
  brokerage:             string | null;
  location:              string | null;
  website:               string | null;
  isaPresence:           string;
  marketingOpsPresence:  string;
  isaVelocity:           "Hot" | "Active" | "None";
  supabaseISAConfirmed:  boolean;
  supabaseMktgConfirmed: boolean;
  liveISASignals:        ISASignal[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SOURCE_LABEL: Record<string, string> = {
  linkedin:         "LI",
  indeed:           "IN",
  ziprecruiter:     "ZR",
  glassdoor:        "GD",
  website:          "Web",
  brokerage_portal: "Portal",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function sortScore(t: TeamSignal): number {
  if (t.isaVelocity !== "None")  return 3;
  if (t.supabaseISAConfirmed)    return 2;
  if (t.isaPresence === "Likely") return 1;
  return 0;
}

function cardBorderColor(t: TeamSignal): string {
  if (t.isaVelocity !== "None")  return "#F97316";
  if (t.supabaseISAConfirmed)    return "#16A34A";
  if (t.isaPresence === "Likely") return "#FBBF24";
  return "#E5E3DF";
}

// ── VelocityBadge ─────────────────────────────────────────────────────────────

function VelocityBadge({ velocity }: { velocity: "Hot" | "Active" | "None" }) {
  if (velocity === "None") return null;
  const isHot  = velocity === "Hot";
  const cls    = isHot
    ? "bg-primary-soft border-primary-muted text-primary"
    : "bg-[var(--success-soft)] border-[var(--success-border)] text-[var(--success)]";
  const dotCls = isHot ? "bg-primary animate-pulse" : "bg-[var(--success)]";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
      {isHot ? "Scaling Up" : "Hiring"}
    </span>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent, explainer }: {
  label:     string;
  value:     number;
  accent?:   boolean;
  explainer: string;
}) {
  return (
    <div className={`rounded-[10px] p-6 border ${accent ? "bg-primary-soft border-primary-muted" : "bg-surface border-edge"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3 mb-3">{label}</p>
      <p
        className={`text-[32px] font-extrabold leading-none mb-2 ${accent ? "text-primary" : "text-ink"}`}
        style={{ letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
      <p className="text-[11px] text-fg3 leading-snug">{explainer}</p>
    </div>
  );
}

// ── FilterSelect ──────────────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options }: {
  label:    string;
  value:    string;
  onChange: (v: string) => void;
  options:  string[];
}) {
  const active = !!value;
  return (
    <div className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors ${active ? "bg-primary-soft border-primary-muted" : "bg-surface border-edge"}`}>
      <select
        className={`bg-transparent text-sm outline-none cursor-pointer ${active ? "text-primary" : "text-fg2"}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All — {label}</option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-surface text-ink">{o}</option>
        ))}
      </select>
    </div>
  );
}

// ── TeamCard ──────────────────────────────────────────────────────────────────

function TeamCard({ team }: { team: TeamSignal }) {
  const siteHref = team.website
    ? team.website.startsWith("http") ? team.website : `https://${team.website}`
    : null;

  const hasHiring  = team.isaVelocity !== "None";
  const borderColor = cardBorderColor(team);
  const topSignal  = team.liveISASignals[0] ?? null;

  return (
    <div
      className="bg-surface border border-edge rounded-[10px] overflow-hidden transition-all duration-200"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderLeftColor = "#FED7AA";
        el.style.boxShadow = "0 2px 12px #F9731610";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderLeftColor = borderColor;
        el.style.boxShadow = "";
      }}
    >
      {/* ROW 1: WHO */}
      <div className="px-5 pt-4 pb-3 border-b border-edge flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-ink leading-snug truncate">{team.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {team.brokerage && <span className="text-[13px] text-fg2">{team.brokerage}</span>}
            {team.brokerage && team.location && <span className="text-fg3 text-[13px]">·</span>}
            {team.location  && <span className="text-[13px] text-fg3">{team.location}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasHiring && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-soft text-primary">
              ⚡ Outreach Now
            </span>
          )}
          {siteHref && (
            <a
              href={siteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12px] text-fg2 hover:text-ink border border-edge rounded-lg px-2.5 py-1 hover:border-primary-muted transition-colors"
            >
              <ExternalLink size={11} />
              Visit website
            </a>
          )}
        </div>
      </div>

      {/* ROW 2: LIVE SIGNAL */}
      <div className="px-5 py-3 border-b border-edge flex items-center gap-3 flex-wrap">
        <span title="Pulled from live job board scraping">
          <LiveLabel />
        </span>
        {hasHiring ? (
          <>
            <VelocityBadge velocity={team.isaVelocity} />
            <span className="text-[13px] font-semibold text-ink">
              {team.liveISASignals.length} ISA {team.liveISASignals.length === 1 ? "role" : "roles"} open
            </span>
            {topSignal && (
              <a
                href={topSignal.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] text-fg2 hover:text-ink transition-colors"
              >
                <span className="font-semibold text-primary text-[11px] px-1.5 py-0.5 bg-primary-soft rounded">
                  {SOURCE_LABEL[topSignal.source] ?? topSignal.source.slice(0, 2).toUpperCase()}
                </span>
                <span className="truncate max-w-[180px]">{topSignal.normalizedRole}</span>
                {topSignal.postedAt && (
                  <span className="text-fg3 shrink-0">{relDate(topSignal.postedAt)}</span>
                )}
                <ExternalLink size={9} className="text-fg3 shrink-0" />
              </a>
            )}
            {team.liveISASignals.length > 1 && (
              <span className="text-[11px] text-fg3">+{team.liveISASignals.length - 1} more</span>
            )}
          </>
        ) : (
          <span className="text-[13px] text-fg3 italic">No active hiring detected</span>
        )}
      </div>

      {/* ROW 3: STATIC CONTEXT */}
      <div className="px-5 py-3 flex items-center gap-3 flex-wrap">
        <span title="Static data from RealTrends research — not real-time">
          <StaticLabel />
        </span>
        <span className="text-[12px] text-fg3">
          ISA Structure:
          <span className={`ml-1 font-semibold ${team.supabaseISAConfirmed ? "text-[#16A34A]" : "text-fg2"}`}>
            {team.supabaseISAConfirmed ? "Confirmed" : "Unknown"}
          </span>
        </span>
        <span className="text-fg3 text-[12px]">·</span>
        <span className="text-[12px] text-fg3">
          Marketing &amp; Ops:
          <span className={`ml-1 font-semibold ${team.supabaseMktgConfirmed ? "text-[#16A34A]" : "text-fg2"}`}>
            {team.supabaseMktgConfirmed ? "Confirmed" : "Unknown"}
          </span>
        </span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SignalsClient() {
  const { toast } = useToast();
  const [teams,   setTeams]   = useState<TeamSignal[]>([]);
  const [loading, setLoading] = useState(true);

  const [search,         setSearch]         = useState("");
  const [filterISA,      setFilterISA]      = useState("");
  const [filterVelocity, setFilterVelocity] = useState("");
  const [filterMktg,     setFilterMktg]     = useState("");

  const loadSignals = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/signals");
      const data = await res.json() as TeamSignal[];
      setTeams(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSignals(); }, [loadSignals]);

  async function updatePresence(
    id:    number,
    field: "isaPresence" | "marketingOpsPresence",
    value: string,
  ) {
    setTeams((prev) => prev.map((t) => t.id === id ? { ...t, [field]: value } : t));
    try {
      await fetch(`/api/signals/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ [field]: value }),
      });
    } catch {
      toast("Failed to save — please try again", "error");
    }
  }

  async function runAutoDetect() {
    const unknowns = teams.filter(
      (t) => t.isaPresence === "Unknown" || t.marketingOpsPresence === "Unknown"
    );
    if (unknowns.length === 0) {
      toast("All teams already have presence signals set.", "info");
      return;
    }
    let updated = 0;
    const BATCH = 5;
    for (let i = 0; i < unknowns.length; i += BATCH) {
      const batch = unknowns.slice(i, i + BATCH);
      try {
        const res = await fetch("/api/signals/autodetect", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            teams: batch.map((t) => ({ id: t.id, name: t.name, brokerage: t.brokerage, location: t.location })),
          }),
        });
        if (res.ok) {
          const { saved } = await res.json() as {
            saved: (Pick<TeamSignal, "id" | "isaPresence" | "marketingOpsPresence"> & { reasoning: string })[];
          };
          const byId = new Map(saved.map((s) => [s.id, s]));
          setTeams((prev) =>
            prev.map((t) => {
              const s = byId.get(t.id);
              return s ? { ...t, isaPresence: s.isaPresence, marketingOpsPresence: s.marketingOpsPresence } : t;
            })
          );
          updated += saved.length;
        }
      } catch { /* continue batch */ }
    }
    toast(`Auto-detected presence signals for ${updated} teams.`, "success");
  }

  // suppress lint — functions kept for future use
  void updatePresence;
  void runAutoDetect;

  const filtered = teams
    .filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterISA === "Confirmed" && !t.supabaseISAConfirmed)  return false;
      if (filterISA === "Unknown"   &&  t.supabaseISAConfirmed)  return false;
      if (filterVelocity === "Actively Hiring" && t.isaVelocity === "None") return false;
      if (filterVelocity === "Not Hiring"      && t.isaVelocity !== "None") return false;
      if (filterMktg === "Confirmed" && !t.supabaseMktgConfirmed) return false;
      if (filterMktg === "Unknown"   &&  t.supabaseMktgConfirmed) return false;
      return true;
    })
    .sort((a, b) => sortScore(b) - sortScore(a));

  const hasFilter = !!(search || filterISA || filterMktg || filterVelocity);

  const stats = {
    isaPresence:  teams.filter((t) => t.supabaseISAConfirmed).length,
    activeHiring: teams.filter((t) => t.isaVelocity !== "None").length,
    mktgPresence: teams.filter((t) => t.supabaseMktgConfirmed).length,
    total:        teams.length,
  };

  function clearFilters() {
    setSearch(""); setFilterISA(""); setFilterVelocity(""); setFilterMktg("");
  }

  return (
    <div className="px-10 pt-10 pb-16 max-w-[1280px] mx-auto">

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <Zap size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-ink" style={{ letterSpacing: "-0.01em" }}>
            Team Signals
          </h1>
        </div>
        <p className="text-sm text-fg2">
          See which of your target accounts are actively hiring ISA roles right now — and which already have an ISA or Marketing team in place.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="ISA Presence"
          value={stats.isaPresence}
          explainer="Teams known to already have an ISA structure"
        />
        <StatCard
          label="Actively Hiring ISA"
          value={stats.activeHiring}
          accent
          explainer="Teams posting ISA roles on job boards right now"
        />
        <StatCard
          label="Marketing & Ops Presence"
          value={stats.mktgPresence}
          explainer="Teams with a dedicated marketing or ops person"
        />
        <StatCard
          label="Target Accounts"
          value={stats.total}
          explainer="Teams on Fello's priority outreach list"
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-2.5 mb-6">
        <div className="flex items-center gap-2 bg-surface border border-edge rounded-lg px-3 py-2.5">
          <Search size={14} className="text-fg3 shrink-0" />
          <input
            className="bg-transparent text-ink text-sm placeholder-fg3 outline-none flex-1"
            placeholder="Search teams…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")}>
              <X size={13} className="text-fg3 hover:text-fg2 transition-colors" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <FilterSelect
            label="ISA Presence"
            value={filterISA}
            onChange={setFilterISA}
            options={["Confirmed", "Unknown"]}
          />
          <FilterSelect
            label="ISA Hiring"
            value={filterVelocity}
            onChange={setFilterVelocity}
            options={["Actively Hiring", "Not Hiring"]}
          />
          <FilterSelect
            label="Marketing & Ops"
            value={filterMktg}
            onChange={setFilterMktg}
            options={["Confirmed", "Unknown"]}
          />
          {hasFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-fg2 hover:text-ink px-3 py-1.5 rounded-lg hover:bg-surface-raised transition-colors"
            >
              Clear filters
            </button>
          )}
          <span className="ml-auto text-xs text-fg3">
            {filtered.length} of {stats.total} teams
          </span>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface border border-edge rounded-[10px] overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: "#E5E3DF" }}>
              <div className="px-5 pt-4 pb-3 border-b border-edge flex justify-between">
                <div>
                  <Skeleton className="h-4 w-44 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-7 w-24" />
              </div>
              <div className="px-5 py-3 border-b border-edge">
                <Skeleton className="h-3 w-3/4" />
              </div>
              <div className="px-5 py-3">
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-edge rounded-[10px] py-16 text-center">
          <p className="text-fg2 text-sm mb-1">No signals detected.</p>
          <p className="text-fg3 text-[13px] mb-4">Run a scrape to light this up.</p>
          {hasFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-primary hover:text-primary-hover text-sm transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Section divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-edge" />
            <span className="text-[11px] text-fg3 whitespace-nowrap">
              Sorted by signal strength — highest priority first
            </span>
            <div className="flex-1 h-px bg-edge" />
          </div>

          <div className="space-y-3">
            {filtered.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
