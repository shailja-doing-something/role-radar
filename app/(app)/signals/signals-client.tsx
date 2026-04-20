"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Zap, Sparkles, ExternalLink, Search, X,
  CheckCircle2, AlertCircle, MinusCircle, HelpCircle,
  ChevronDown, Check,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";

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
  id:                   number;
  name:                 string;
  brokerage:            string | null;
  location:             string | null;
  website:              string | null;
  isaPresence:          string;
  marketingOpsPresence: string;
  isaVelocity:          "Hot" | "Active" | "None";
  liveISASignals:       ISASignal[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESENCE_OPTIONS = ["Confirmed", "Likely", "None", "Unknown"] as const;
type PresenceValue = (typeof PRESENCE_OPTIONS)[number];

const PRESENCE: Record<PresenceValue, { badge: string; icon: React.ElementType }> = {
  Confirmed: { badge: "bg-[var(--success-soft)] border-[var(--success-border)] text-[var(--success)]",   icon: CheckCircle2 },
  Likely:    { badge: "bg-[var(--warning-soft)] border-[var(--warning-border)] text-[var(--warning)]",   icon: AlertCircle  },
  None:      { badge: "bg-surface-raised border-edge text-fg3",                                          icon: MinusCircle  },
  Unknown:   { badge: "bg-surface-raised border-edge text-fg3",                                          icon: HelpCircle   },
};

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
  if (t.isaVelocity !== "None")      return 3;
  if (t.isaPresence === "Confirmed") return 2;
  if (t.isaPresence === "Likely")    return 1;
  return 0;
}

function presenceKey(value: string): PresenceValue {
  return (PRESENCE_OPTIONS as readonly string[]).includes(value)
    ? (value as PresenceValue)
    : "Unknown";
}

function cardAccentClasses(t: TeamSignal): string {
  if (t.isaVelocity !== "None")      return "border-l-4 border-l-primary";
  if (t.isaPresence === "Confirmed") return "border-l-4 border-l-green-600";
  if (t.isaPresence === "Likely")    return "border-l-4 border-l-amber-500";
  return "";
}

// ── PresencePicker ────────────────────────────────────────────────────────────

function PresencePicker({
  value,
  onChange,
}: {
  value:    string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref  = useRef<HTMLDivElement>(null);
  const key  = presenceKey(value);
  const { badge, icon: Icon } = PRESENCE[key];

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded border transition-opacity hover:opacity-80 ${badge}`}
      >
        <Icon size={10} />
        {value}
        <ChevronDown size={9} className="opacity-50 ml-0.5" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-40 bg-surface border border-edge rounded-lg shadow-lg overflow-hidden min-w-[140px]">
          {PRESENCE_OPTIONS.map((opt) => {
            const { badge: oBadge, icon: OIcon } = PRESENCE[opt];
            return (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-raised transition-colors"
              >
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${oBadge}`}
                >
                  <OIcon size={9} />
                  {opt}
                </span>
                {opt === value && (
                  <Check size={10} className="ml-auto text-fg2 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── VelocityBadge ─────────────────────────────────────────────────────────────

function VelocityBadge({ velocity }: { velocity: "Hot" | "Active" | "None" }) {
  if (velocity === "None") return null;

  const isHot = velocity === "Hot";
  const cls    = isHot
    ? "bg-primary-soft border-primary-muted text-primary"
    : "bg-[var(--success-soft)] border-[var(--success-border)] text-[var(--success)]";
  const dotCls = isHot ? "bg-primary animate-pulse" : "bg-[var(--success)]";
  const label  = isHot ? "Scaling Up" : "Hiring";

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
      {label}
    </span>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, accent,
}: {
  label:   string;
  value:   number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[10px] p-6 border ${
        accent
          ? "bg-primary-soft border-primary-muted"
          : "bg-surface border-edge"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3 mb-3">
        {label}
      </p>
      <p
        className={`text-[32px] font-extrabold leading-none ${accent ? "text-primary" : "text-ink"}`}
        style={{ letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
    </div>
  );
}

// ── FilterSelect ──────────────────────────────────────────────────────────────

function FilterSelect({
  label, value, onChange, options,
}: {
  label:    string;
  value:    string;
  onChange: (v: string) => void;
  options:  string[];
}) {
  const active = !!value;
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors ${
        active
          ? "bg-primary-soft border-primary-muted"
          : "bg-surface border-edge"
      }`}
    >
      <select
        className={`bg-transparent text-sm outline-none cursor-pointer ${
          active ? "text-primary" : "text-fg2"
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All — {label}</option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-surface text-ink">
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── TeamCard ──────────────────────────────────────────────────────────────────

function TeamCard({
  team,
  onUpdate,
}: {
  team:     TeamSignal;
  onUpdate: (id: number, field: "isaPresence" | "marketingOpsPresence", value: string) => void;
}) {
  const siteHref = team.website
    ? team.website.startsWith("http")
      ? team.website
      : `https://${team.website}`
    : null;

  return (
    <div
      className={`bg-surface border border-edge rounded-[10px] p-4 grid grid-cols-[30%_1fr_1fr] ${cardAccentClasses(team)}`}
    >
      {/* ── Left: team info ──────────────────────────────────────────────── */}
      <div className="pr-4 min-w-0">
        <p className="text-[15px] font-semibold text-ink leading-snug truncate">
          {team.name}
        </p>
        {team.brokerage && (
          <p className="text-[13px] text-fg2 truncate mt-0.5">{team.brokerage}</p>
        )}
        {team.location && (
          <p className="text-[13px] text-fg3 mt-0.5">{team.location}</p>
        )}
        {siteHref && (
          <a
            href={siteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary-hover transition-colors mt-2"
          >
            <ExternalLink size={10} />
            website
          </a>
        )}
      </div>

      {/* ── Center: ISA hiring activity ──────────────────────────────────── */}
      <div className="border-x border-edge px-4 min-w-0">
        {team.liveISASignals.length === 0 ? (
          <p className="text-fg3 text-sm">No active hiring</p>
        ) : (
          <>
            <VelocityBadge velocity={team.isaVelocity} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {team.liveISASignals.slice(0, 4).map((sig) => (
                <a
                  key={sig.id}
                  href={sig.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] bg-surface-raised border border-edge hover:border-primary-muted text-fg2 hover:text-ink px-2 py-0.5 rounded transition-colors"
                >
                  <span className="font-semibold text-primary shrink-0">
                    {SOURCE_LABEL[sig.source] ?? sig.source.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="truncate max-w-[90px]">{sig.normalizedRole}</span>
                  <ExternalLink size={8} className="shrink-0 text-fg3" />
                </a>
              ))}
              {team.liveISASignals.length > 4 && (
                <span className="text-[11px] text-fg3 px-1 py-0.5">
                  +{team.liveISASignals.length - 4} more
                </span>
              )}
            </div>
            {team.liveISASignals[0]?.postedAt && (
              <p className="text-[11px] text-fg3 mt-2">
                Last: {relDate(team.liveISASignals[0].postedAt)}
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Right: presence pickers ──────────────────────────────────────── */}
      <div className="pl-4 space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg3 mb-1.5">
            ISA Structure
          </p>
          <PresencePicker
            value={team.isaPresence}
            onChange={(v) => onUpdate(team.id, "isaPresence", v)}
          />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg3 mb-1.5">
            Mktg &amp; Ops
          </p>
          <PresencePicker
            value={team.marketingOpsPresence}
            onChange={(v) => onUpdate(team.id, "marketingOpsPresence", v)}
          />
        </div>
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

  const [detecting,      setDetecting]      = useState(false);
  const [detectProgress, setDetectProgress] = useState(0);
  const [detectTotal,    setDetectTotal]    = useState(0);

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

    setDetecting(true);
    setDetectProgress(0);
    setDetectTotal(unknowns.length);

    let updated = 0;
    const BATCH = 5;

    for (let i = 0; i < unknowns.length; i += BATCH) {
      const batch = unknowns.slice(i, i + BATCH);
      try {
        const res = await fetch("/api/signals/autodetect", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            teams: batch.map((t) => ({
              id: t.id, name: t.name, brokerage: t.brokerage, location: t.location,
            })),
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
              return s
                ? { ...t, isaPresence: s.isaPresence, marketingOpsPresence: s.marketingOpsPresence }
                : t;
            })
          );
          updated += saved.length;
        }
      } catch { /* continue batch */ }
      setDetectProgress(Math.min(i + BATCH, unknowns.length));
    }

    setDetecting(false);
    toast(`Auto-detected presence signals for ${updated} teams.`, "success");
  }

  const filtered = teams
    .filter((t) => {
      if (search         && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterISA      && t.isaPresence          !== filterISA)      return false;
      if (filterMktg     && t.marketingOpsPresence !== filterMktg)     return false;
      if (filterVelocity && t.isaVelocity          !== filterVelocity) return false;
      return true;
    })
    .sort((a, b) => sortScore(b) - sortScore(a));

  const hasFilter = !!(search || filterISA || filterMktg || filterVelocity);

  const stats = {
    isaConfirmed:  teams.filter((t) => t.isaPresence          === "Confirmed").length,
    activeHiring:  teams.filter((t) => t.isaVelocity          !== "None").length,
    mktgConfirmed: teams.filter((t) => t.marketingOpsPresence === "Confirmed").length,
    total:         teams.length,
  };

  function clearFilters() {
    setSearch(""); setFilterISA(""); setFilterVelocity(""); setFilterMktg("");
  }

  return (
    <div className="px-10 pt-10 pb-16 max-w-[1280px] mx-auto">

      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Zap size={20} className="text-primary" />
            <h1 className="text-2xl font-bold text-ink" style={{ letterSpacing: "-0.01em" }}>
              Team Signals
            </h1>
          </div>
          <p className="text-sm text-fg2">
            Live hiring intelligence across your target accounts
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={runAutoDetect}
            disabled={detecting || loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Sparkles size={14} />
            {detecting
              ? `Analyzing ${detectProgress} / ${detectTotal}…`
              : "Auto-detect Signals"}
          </button>
          <span className="text-xs text-fg3">AI estimates — verify manually</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="ISA Presence Confirmed"    value={stats.isaConfirmed}  />
        <StatCard label="Actively Hiring ISA Roles" value={stats.activeHiring}  accent />
        <StatCard label="Mktg / Ops Confirmed"      value={stats.mktgConfirmed} />
        <StatCard label="Target Accounts Tracked"   value={stats.total}         />
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
            options={["Confirmed", "Likely", "None", "Unknown"]}
          />
          <FilterSelect
            label="ISA Hiring"
            value={filterVelocity}
            onChange={setFilterVelocity}
            options={["Hot", "Active", "None"]}
          />
          <FilterSelect
            label="Mktg / Ops"
            value={filterMktg}
            onChange={setFilterMktg}
            options={["Confirmed", "Likely", "None", "Unknown"]}
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
            <div
              key={i}
              className="bg-surface border border-edge rounded-[10px] p-4 grid grid-cols-[30%_1fr_1fr]"
            >
              {[0, 1, 2].map((col) => (
                <div
                  key={col}
                  className={`${col === 0 ? "pr-4" : "px-4"} ${col === 1 ? "border-x border-edge" : ""}`}
                >
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24 mb-1.5" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
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
        <div className="space-y-3">
          {filtered.map((team) => (
            <TeamCard key={team.id} team={team} onUpdate={updatePresence} />
          ))}
        </div>
      )}
    </div>
  );
}
