"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink, Trash2, Plus, X,
  MapPin, Building2, ChevronDown, ChevronRight,
  Flame, Briefcase,
} from "lucide-react";
import { LiveLabel, StaticLabel } from "@/components/source-labels";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ISAEnrichment {
  isa_agent_count: number | null;
  isa_categories:  string[] | null;
}
interface MarketingOpsEnrichment {
  dept_agent_count: number | null;
  departments:      string[] | null;
}
interface RealTrendsEnrichment {
  rank:            number | null;
  annual_revenue:  string | null;
  sides:           number | null;
  real_trends_url: string | null;
}
interface Enrichment {
  isa:          ISAEnrichment | null;
  marketingOps: MarketingOpsEnrichment | null;
  realTrends:   RealTrendsEnrichment | null;
}

interface Team {
  id:             string;
  teamName:       string;
  brokerage:      string | null;
  location:       string | null;
  website:        string | null;
  isMatched:      boolean;
  isPriority:     boolean;
  supabaseTeamId: string | null;
  uploadedAt:     string;
  roleCount:      number;
  latestTitle:    string | null;
  enrichment:     Enrichment | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff   = Date.now() - new Date(iso).getTime();
  const days   = Math.floor(diff / 86400000);
  const weeks  = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  if (days  < 1)  return "today";
  if (days  < 7)  return `${days}d ago`;
  if (weeks < 5)  return `${weeks}w ago`;
  return `${months}mo ago`;
}

function VelocityBadge({ roleCount }: { roleCount: number }) {
  if (roleCount >= 3) return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      Scaling Up
    </span>
  );
  if (roleCount >= 1) return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--success)]">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
      Hiring
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[11px] text-fg3">
      <span className="w-1.5 h-1.5 rounded-full bg-fg3 opacity-40" />
      Watching
    </span>
  );
}

function EnrichmentBadge({ label, color, tooltip }: { label: string; color: "green" | "blue"; tooltip: string }) {
  const cls = color === "green"
    ? "bg-[var(--success-soft)] border-[var(--success-border)] text-[var(--success)]"
    : "bg-surface-raised border-edge text-fg2";
  return (
    <span className={`relative group inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border cursor-default ${cls}`}>
      {label}
      {tooltip && (
        <span className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-10 min-w-[180px] max-w-[240px] bg-surface border border-edge rounded-lg shadow-lg px-3 py-2 text-[11px] text-fg2 leading-relaxed whitespace-pre-wrap">
          {tooltip}
        </span>
      )}
    </span>
  );
}

interface PostingRow { id: number; title: string; location: string | null; createdAt: string; }

function TeamCard({ team, onDelete, deletingId }: {
  team: Team; onDelete: (id: string, teamName: string) => void; deletingId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [postings, setPostings] = useState<PostingRow[]>([]);
  const [loading,  setLoading]  = useState(false);

  async function toggle() {
    if (!expanded && postings.length === 0) {
      setLoading(true);
      try {
        const res = await fetch(`/api/postings?company=${encodeURIComponent(team.teamName)}&top100Only=true&limit=20`);
        if (res.ok) setPostings(((await res.json()) as { postings?: PostingRow[] }).postings ?? []);
      } finally { setLoading(false); }
    }
    setExpanded((v) => !v);
  }

  const accentClass = team.roleCount >= 3 ? "border-l-primary"
    : team.roleCount >= 1 ? "border-l-green-600"
    : "border-l-edge";

  const e  = team.enrichment;
  const rt = e?.realTrends;
  const hasStatic = e && (rt || e.isa || e.marketingOps);

  return (
    <div className={`bg-surface border border-edge border-l-4 ${accentClass} rounded-xl overflow-hidden`}>

      {/* Card header — team name + meta */}
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-start gap-3 px-4 pt-4 pb-3 hover:bg-surface-raised transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-ink font-semibold text-sm truncate">{team.teamName}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap text-xs">
            {team.brokerage && (
              <span className="flex items-center gap-1 text-fg2">
                <Building2 size={10} className="shrink-0" />{team.brokerage}
              </span>
            )}
            {team.location && (
              <span className="flex items-center gap-1 text-fg3">
                <MapPin size={10} className="shrink-0" />{team.location}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {team.website && (
            <a href={team.website.startsWith("http") ? team.website : `https://${team.website}`}
              target="_blank" rel="noopener noreferrer"
              onClick={(ev) => ev.stopPropagation()}
              className="text-fg3 hover:text-primary transition-colors">
              <ExternalLink size={13} />
            </a>
          )}
          <button type="button"
            onClick={(ev) => { ev.stopPropagation(); onDelete(team.id, team.teamName); }}
            disabled={deletingId === team.id}
            className="text-fg3 hover:text-[var(--danger)] disabled:opacity-40 transition-colors">
            <Trash2 size={13} />
          </button>
          {expanded ? <ChevronDown size={13} className="text-fg3" /> : <ChevronRight size={13} className="text-fg3" />}
        </div>
      </button>

      {/* ── Section A — LIVE ────────────────────────────────────────────────── */}
      <div className="px-4 pb-3 border-t border-edge">
        <div className="flex items-center gap-2 mt-2.5 mb-2">
          <LiveLabel />
        </div>
        {team.roleCount > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            <VelocityBadge roleCount={team.roleCount} />
            <span className="text-[12px] text-fg2">
              {team.roleCount} active {team.roleCount === 1 ? "role" : "roles"}
            </span>
            {team.latestTitle && (
              <span className="text-[12px] text-fg3 truncate">· {team.latestTitle}</span>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-fg3">No active hiring detected</p>
        )}
      </div>

      {/* ── Section B — STATIC ──────────────────────────────────────────────── */}
      {hasStatic && (
        <div className="px-4 pb-3 border-t border-edge">
          <div className="flex items-center gap-2 mt-2.5 mb-2">
            <StaticLabel />
          </div>

          {rt && (rt.rank || rt.sides || rt.annual_revenue) && (
            <p className="text-[11px] text-fg3 mb-2">
              {rt.rank            && <>RealTrends #{rt.rank}</>}
              {rt.rank && (rt.sides || rt.annual_revenue) && " · "}
              {rt.sides           && <>{rt.sides.toLocaleString()} sides</>}
              {rt.sides && rt.annual_revenue && " · "}
              {rt.annual_revenue  && <>{rt.annual_revenue}</>}
            </p>
          )}

          {(e.isa || e.marketingOps) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {e.isa && (
                <EnrichmentBadge label="ISA Confirmed" color="green"
                  tooltip={[
                    e.isa.isa_agent_count != null ? `ISA agents: ${e.isa.isa_agent_count}` : null,
                    e.isa.isa_categories?.length   ? `Categories: ${e.isa.isa_categories.join(", ")}` : null,
                  ].filter(Boolean).join("\n")} />
              )}
              {e.marketingOps && (
                <EnrichmentBadge label="Mktg/Ops Confirmed" color="blue"
                  tooltip={[
                    e.marketingOps.dept_agent_count != null ? `Members: ${e.marketingOps.dept_agent_count}` : null,
                    e.marketingOps.departments?.length      ? `Depts: ${e.marketingOps.departments.join(", ")}` : null,
                  ].filter(Boolean).join("\n")} />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Expanded postings ────────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-edge px-4 pb-4 pt-3 bg-surface-raised">
          {loading ? (
            <p className="text-fg3 text-xs">Loading roles…</p>
          ) : postings.length === 0 ? (
            <p className="text-fg3 text-xs italic">No active postings found</p>
          ) : (
            <div className="space-y-2">
              {postings.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Briefcase size={11} className="text-fg3 shrink-0" />
                    <span className="text-sm text-fg2 truncate">{p.title}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-fg3">
                    {p.location && <span>{p.location}</span>}
                    <span>{timeAgo(p.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add team drawer ───────────────────────────────────────────────────────────

const FIELD_DEFS: { label: string; key: "teamName"|"brokerage"|"location"|"website"; placeholder: string; required?: boolean }[] = [
  { label: "Team Name *", key: "teamName",  placeholder: "e.g. The Smith Group", required: true },
  { label: "Brokerage",   key: "brokerage", placeholder: "e.g. Keller Williams" },
  { label: "Location",    key: "location",  placeholder: "e.g. Austin, TX" },
  { label: "Website",     key: "website",   placeholder: "https://example.com" },
];

export function Top100Client({ teams: initial }: { teams: Team[] }) {
  const [teams,      setTeams]      = useState(initial);
  const [tab,        setTab]        = useState<"hiring"|"all">("hiring");
  const [showDrawer, setShowDrawer] = useState(false);
  const [form,       setForm]       = useState({ teamName: "", brokerage: "", location: "", website: "" });
  const [saving,     setSaving]     = useState(false);
  const [addError,   setAddError]   = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDrawer) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setShowDrawer(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [showDrawer]);

  const hiring    = teams.filter((t) => t.roleCount > 0);
  const allTeams  = teams;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.teamName.trim()) { setAddError("Team name is required."); return; }
    setSaving(true); setAddError("");
    try {
      const res = await fetch("/api/target-accounts/add", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setAddError(d.error ?? "Failed to add team.");
      } else {
        const team = await res.json() as Team;
        setTeams((t) => [...t, { ...team, roleCount: 0, latestTitle: null, enrichment: null }]);
        setForm({ teamName: "", brokerage: "", location: "", website: "" });
        setShowDrawer(false);
        router.refresh();
      }
    } catch { setAddError("Something went wrong."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, teamName: string) {
    if (!confirm(`Remove "${teamName}" from the list?`)) return;
    setDeletingId(id);
    try {
      await fetch(`/api/target-accounts/${id}`, { method: "DELETE" });
      setTeams((t) => t.filter((team) => team.id !== id));
      router.refresh();
    } finally { setDeletingId(null); }
  }

  return (
    <>
      {showDrawer && <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowDrawer(false)} />}
      <div ref={drawerRef}
        className={`fixed inset-y-0 right-0 z-50 w-[380px] bg-surface border-l border-edge shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${showDrawer ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-edge">
          <h2 className="text-ink font-semibold">Add Team</h2>
          <button type="button" onClick={() => setShowDrawer(false)} className="text-fg3 hover:text-ink transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleAdd} className="flex-1 flex flex-col px-6 py-5 gap-4 overflow-y-auto">
          {FIELD_DEFS.map(({ label, key, placeholder, required }) => (
            <div key={key}>
              <label className="block text-fg2 text-xs mb-1.5">{label}</label>
              <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder} required={required ?? false}
                className="w-full bg-surface-raised border border-edge rounded-lg px-3 py-2 text-ink text-sm placeholder-fg3 focus:outline-none focus:border-primary transition-colors" />
            </div>
          ))}
          {addError && <p className="text-[var(--danger)] text-sm">{addError}</p>}
          <div className="mt-auto flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors">
              {saving ? "Adding…" : "Add Team"}
            </button>
            <button type="button" onClick={() => setShowDrawer(false)}
              className="px-4 py-2 text-sm text-fg2 hover:text-ink transition-colors">Cancel</button>
          </div>
        </form>
      </div>

      {/* Tabs + Add button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1 bg-surface border border-edge rounded-lg p-1">
          {([["hiring", "Hiring Now", hiring.length], ["all", "All Accounts", allTeams.length]] as const).map(([t, label, count]) => {
            const active = tab === t;
            return (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${active ? "bg-surface-raised text-ink" : "text-fg2 hover:text-ink"}`}>
                <span>{label}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${active ? "bg-primary-soft text-primary" : "bg-surface-raised text-fg3"}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setShowDrawer(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={14} /> Add Team
        </button>
      </div>

      {/* Hiring Now tab */}
      {tab === "hiring" && (
        hiring.length === 0 ? (
          <div className="bg-surface border border-edge rounded-xl py-12 text-center">
            <Flame size={28} className="text-fg3 mx-auto mb-3" />
            <p className="text-fg2 text-sm">No hiring activity yet — run a scrape to find open roles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {hiring.map((team) => (
              <TeamCard key={team.id} team={team} onDelete={handleDelete} deletingId={deletingId} />
            ))}
          </div>
        )
      )}

      {/* All Accounts tab */}
      {tab === "all" && (
        allTeams.length === 0 ? (
          <div className="bg-surface border border-edge rounded-xl py-12 text-center">
            <p className="text-fg2 text-sm">No target accounts yet.</p>
          </div>
        ) : (
          <div className="bg-surface border border-edge rounded-xl overflow-hidden">
            <div className="divide-y divide-edge">
              {allTeams.map((team) => (
                <div key={team.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-raised transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-ink text-sm font-medium truncate">{team.teamName}</p>
                      {team.isPriority && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 border border-orange-200 text-orange-600 uppercase tracking-wide shrink-0">
                          Priority
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {team.brokerage && (
                        <span className="flex items-center gap-1 text-fg3 text-xs">
                          <Building2 size={10} className="shrink-0" />{team.brokerage}
                        </span>
                      )}
                      {team.location && (
                        <span className="flex items-center gap-1 text-fg3 text-xs">
                          <MapPin size={10} className="shrink-0" />{team.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {team.roleCount > 0 ? (
                      <span className="text-xs font-semibold text-primary">{team.roleCount} open {team.roleCount === 1 ? "role" : "roles"}</span>
                    ) : (
                      <span className="text-fg3 text-xs">No active postings</span>
                    )}
                    <span className="text-fg3 text-xs">{timeAgo(team.uploadedAt)}</span>
                    {team.website && (
                      <a href={team.website.startsWith("http") ? team.website : `https://${team.website}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-fg3 hover:text-primary transition-colors">
                        <ExternalLink size={13} />
                      </a>
                    )}
                    <button type="button" onClick={() => handleDelete(team.id, team.teamName)}
                      disabled={deletingId === team.id}
                      className="text-fg3 hover:text-[var(--danger)] disabled:opacity-40 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </>
  );
}
