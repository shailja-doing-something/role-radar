"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Radar, Sparkles, ExternalLink, Search, Filter,
  Zap, CheckCircle2, AlertCircle, MinusCircle, HelpCircle,
} from "lucide-react";

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

const PRESENCE_STYLES: Record<string, string> = {
  Confirmed: "bg-green-900/40 border-green-700/50 text-green-400",
  Likely:    "bg-amber-900/40 border-amber-700/50 text-amber-400",
  None:      "bg-gray-800/60 border-gray-700 text-gray-500",
  Unknown:   "bg-gray-900/40 border-gray-800 text-gray-600",
};

const PRESENCE_ICONS: Record<string, React.ReactNode> = {
  Confirmed: <CheckCircle2 size={11} />,
  Likely:    <AlertCircle  size={11} />,
  None:      <MinusCircle  size={11} />,
  Unknown:   <HelpCircle   size={11} />,
};

const SOURCE_LABELS: Record<string, string> = {
  linkedin:     "LI",
  indeed:       "IN",
  ziprecruiter: "ZR",
  glassdoor:    "GD",
};

function PresenceBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${PRESENCE_STYLES[value] ?? PRESENCE_STYLES.Unknown}`}>
      {PRESENCE_ICONS[value] ?? PRESENCE_ICONS.Unknown}
      {value}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SignalsClient() {
  const [teams,    setTeams]    = useState<TeamSignal[]>([]);
  const [loading,  setLoading]  = useState(true);

  // Filters
  const [search,        setSearch]        = useState("");
  const [filterISA,     setFilterISA]     = useState("");
  const [filterVelocity,setFilterVelocity]= useState("");
  const [filterMktg,    setFilterMktg]    = useState("");

  // Auto-detect
  const [detecting,      setDetecting]      = useState(false);
  const [detectProgress, setDetectProgress] = useState(0);
  const [detectTotal,    setDetectTotal]    = useState(0);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  // ── Fetch data ──────────────────────────────────────────────────────────────
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

  // ── Toast helper ────────────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  }

  // ── Optimistic inline update ────────────────────────────────────────────────
  async function updatePresence(
    id:    number,
    field: "isaPresence" | "marketingOpsPresence",
    value: string,
  ) {
    setTeams(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    await fetch(`/api/signals/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ [field]: value }),
    });
  }

  // ── Auto-detect ─────────────────────────────────────────────────────────────
  async function runAutoDetect() {
    const unknowns = teams.filter(
      t => t.isaPresence === "Unknown" || t.marketingOpsPresence === "Unknown"
    );
    if (unknowns.length === 0) {
      showToast("All teams already have presence signals.");
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
        const res  = await fetch("/api/signals/autodetect", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            teams: batch.map(t => ({ id: t.id, name: t.name, brokerage: t.brokerage, location: t.location })),
          }),
        });
        if (res.ok) {
          const { saved } = await res.json() as { saved: (TeamSignal & { reasoning: string })[] };
          const byId = new Map(saved.map(s => [s.id, s]));
          setTeams(prev => prev.map(t => {
            const s = byId.get(t.id);
            return s ? { ...t, isaPresence: s.isaPresence, marketingOpsPresence: s.marketingOpsPresence } : t;
          }));
          updated += saved.length;
        }
      } catch { /* continue */ }
      setDetectProgress(Math.min(i + BATCH, unknowns.length));
    }

    setDetecting(false);
    showToast(`Auto-detected presence signals for ${updated} teams.`);
  }

  // ── Filter + stats ──────────────────────────────────────────────────────────
  const filtered = teams.filter(t => {
    if (search        && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterISA     && t.isaPresence          !== filterISA)     return false;
    if (filterMktg    && t.marketingOpsPresence !== filterMktg)    return false;
    if (filterVelocity && t.isaVelocity         !== filterVelocity) return false;
    return true;
  });

  const hasFilter = search || filterISA || filterMktg || filterVelocity;

  const stats = {
    isaConfirmed:    teams.filter(t => t.isaPresence          === "Confirmed").length,
    activeHiring:    teams.filter(t => t.isaVelocity          !== "None").length,
    mktgConfirmed:   teams.filter(t => t.marketingOpsPresence === "Confirmed").length,
    total:           teams.length,
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 relative">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-800 border border-gray-700 text-white text-sm px-4 py-3 rounded-xl shadow-xl animate-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Radar size={22} className="text-blue-400" />
            Team Signals
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Live hiring intelligence across your Top 100 target accounts.
          </p>
        </div>

        {/* Auto-detect */}
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={runAutoDetect}
            disabled={detecting || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Sparkles size={14} />
            {detecting
              ? `Analyzing ${detectProgress}/${detectTotal} teams…`
              : "Auto-detect"}
          </button>
          <span className="text-gray-600 text-xs">AI estimates — verify manually</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="ISA Presence Confirmed"      value={stats.isaConfirmed}  />
        <StatCard label="Actively Hiring ISA Roles"   value={stats.activeHiring}  accent="blue" />
        <StatCard label="Mktg / Ops Confirmed"        value={stats.mktgConfirmed} />
        <StatCard label="Target Accounts Tracked"     value={stats.total}         />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={14} className="text-gray-500 shrink-0" />
          <input
            className="bg-transparent text-white text-sm placeholder-gray-500 outline-none w-full"
            placeholder="Search teams…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <SelectFilter
          icon={<Filter size={13} className="text-gray-500" />}
          value={filterISA}
          onChange={setFilterISA}
          placeholder="ISA Presence"
        />
        <SelectFilter
          icon={<Zap size={13} className="text-gray-500" />}
          value={filterVelocity}
          onChange={setFilterVelocity}
          placeholder="ISA Hiring"
          options={[
            { value: "Hot",    label: "Hot"    },
            { value: "Active", label: "Active" },
            { value: "None",   label: "None"   },
          ]}
        />
        <SelectFilter
          icon={<Filter size={13} className="text-gray-500" />}
          value={filterMktg}
          onChange={setFilterMktg}
          placeholder="Mktg / Ops"
        />

        {hasFilter && (
          <button
            onClick={() => { setSearch(""); setFilterISA(""); setFilterVelocity(""); setFilterMktg(""); }}
            className="text-sm text-gray-400 hover:text-white px-3 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-3 border-b border-gray-800 bg-gray-900">
          <div className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">ISA Structure</div>
          <div className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide border-x border-gray-800">ISA Hiring Activity</div>
          <div className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Marketing &amp; Ops</div>
        </div>

        {loading ? (
          <SkeletonRows />
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500 text-sm">No teams match your filters.</p>
            {hasFilter && (
              <button
                onClick={() => { setSearch(""); setFilterISA(""); setFilterVelocity(""); setFilterMktg(""); }}
                className="mt-3 text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {filtered.map(team => (
              <TeamRow
                key={team.id}
                team={team}
                onUpdatePresence={updatePresence}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-gray-700 text-xs mt-3 text-right">
        {filtered.length} of {teams.length} teams
      </p>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent?: "blue" }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent === "blue" ? "text-blue-400" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function SelectFilter({
  icon, value, onChange, placeholder, options,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options?: { value: string; label: string }[];
}) {
  const presenceOptions = options ?? [
    { value: "Confirmed", label: "Confirmed" },
    { value: "Likely",    label: "Likely"    },
    { value: "None",      label: "None"      },
    { value: "Unknown",   label: "Unknown"   },
  ];

  return (
    <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
      {icon}
      <select
        className="bg-transparent text-sm text-gray-300 outline-none"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">All — {placeholder}</option>
        {presenceOptions.map(o => (
          <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function TeamRow({
  team,
  onUpdatePresence,
}: {
  team: TeamSignal;
  onUpdatePresence: (id: number, field: "isaPresence" | "marketingOpsPresence", value: string) => void;
}) {
  const mostRecent = team.liveISASignals[0]?.postedAt ?? null;

  return (
    <div className="grid grid-cols-3 hover:bg-gray-800/20 transition-colors">

      {/* Col 1 — ISA Structure */}
      <div className="px-6 py-4">
        <PresenceDropdown
          value={team.isaPresence}
          onChange={v => onUpdatePresence(team.id, "isaPresence", v)}
        />
        <p className="text-gray-200 text-sm font-medium mt-2 truncate">{team.name}</p>
        {team.brokerage && (
          <p className="text-gray-500 text-xs truncate">{team.brokerage}</p>
        )}
        {team.location && (
          <p className="text-gray-600 text-xs">{team.location}</p>
        )}
      </div>

      {/* Col 2 — ISA Hiring Activity */}
      <div className="px-6 py-4 border-x border-gray-800">
        {team.liveISASignals.length === 0 ? (
          <p className="text-gray-600 text-sm">No active hiring</p>
        ) : (
          <>
            <VelocityBadge velocity={team.isaVelocity} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {team.liveISASignals.slice(0, 4).map(sig => (
                <a
                  key={sig.id}
                  href={sig.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-2 py-1 rounded-md border border-gray-700 transition-colors"
                >
                  <span className="font-medium text-blue-400">{SOURCE_LABELS[sig.source] ?? sig.source.slice(0,2).toUpperCase()}</span>
                  <span className="truncate max-w-28">{sig.normalizedRole}</span>
                  <ExternalLink size={9} className="shrink-0 text-gray-600" />
                </a>
              ))}
              {team.liveISASignals.length > 4 && (
                <span className="text-xs text-gray-600 px-2 py-1">
                  +{team.liveISASignals.length - 4} more
                </span>
              )}
            </div>
            {mostRecent && (
              <p className="text-gray-600 text-xs mt-2">
                Last seen: {relativeDate(mostRecent)}
              </p>
            )}
          </>
        )}
      </div>

      {/* Col 3 — Marketing & Ops */}
      <div className="px-6 py-4">
        <PresenceDropdown
          value={team.marketingOpsPresence}
          onChange={v => onUpdatePresence(team.id, "marketingOpsPresence", v)}
        />
        {team.website && (
          <a
            href={team.website.startsWith("http") ? team.website : `https://${team.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs mt-2 transition-colors"
          >
            <ExternalLink size={10} />
            Visit website
          </a>
        )}
      </div>
    </div>
  );
}

function PresenceDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <PresenceBadge value={value} />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 outline-none px-1.5 py-1 hover:border-gray-600 transition-colors"
      >
        <option value="Unknown">Unknown</option>
        <option value="Confirmed">Confirmed</option>
        <option value="Likely">Likely</option>
        <option value="None">None</option>
      </select>
    </div>
  );
}

function VelocityBadge({ velocity }: { velocity: "Hot" | "Active" | "None" }) {
  const styles = {
    Hot:    "bg-red-900/40 border-red-700/50 text-red-400",
    Active: "bg-yellow-900/40 border-yellow-700/50 text-yellow-400",
    None:   "bg-gray-800 border-gray-700 text-gray-500",
  };
  const dots = { Hot: "🔴", Active: "🟡", None: "" };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${styles[velocity]}`}>
      {dots[velocity]} {velocity} hiring
    </span>
  );
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-gray-800/60">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="grid grid-cols-3 animate-pulse">
          {[0,1,2].map(col => (
            <div key={col} className={`px-6 py-4 ${col === 1 ? "border-x border-gray-800" : ""}`}>
              <div className="h-4 bg-gray-800 rounded w-24 mb-2" />
              <div className="h-3 bg-gray-800 rounded w-32 mb-1.5" />
              <div className="h-3 bg-gray-800 rounded w-20" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
