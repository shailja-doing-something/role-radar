"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink, Trash2, Plus, X,
  MapPin, Building2, ChevronDown, ChevronRight,
  Flame, Briefcase,
} from "lucide-react";

interface Team {
  id:        number;
  name:      string;
  brokerage: string | null;
  location:  string | null;
  website:   string | null;
  isMatched: boolean;
  createdAt: string;
  roleCount: number;
}

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const days  = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  if (days  < 1)  return "today";
  if (days  < 7)  return `${days}d ago`;
  if (weeks < 5)  return `${weeks}w ago`;
  return `${months}mo ago`;
}

function VelocityBadge({ roleCount }: { roleCount: number }) {
  if (roleCount >= 3) {
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        Hot
      </span>
    );
  }
  if (roleCount >= 1) {
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold text-green-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
        Hiring
      </span>
    );
  }
  return <span className="text-[11px] text-fg3">Quiet</span>;
}

interface PostingRow {
  id:        number;
  title:     string;
  location:  string | null;
  createdAt: string;
}

function TeamCard({
  team,
  onDelete,
  deletingId,
}: {
  team:       Team;
  onDelete:   (id: number, name: string) => void;
  deletingId: number | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [postings, setPostings] = useState<PostingRow[]>([]);
  const [loading,  setLoading]  = useState(false);

  async function toggle() {
    if (!expanded && postings.length === 0) {
      setLoading(true);
      try {
        const res = await fetch(`/api/postings?company=${encodeURIComponent(team.name)}&top100Only=true&limit=20`);
        if (res.ok) {
          const d = await res.json() as { postings?: PostingRow[] };
          setPostings(d.postings ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    setExpanded((v) => !v);
  }

  const accentClass = team.roleCount >= 3
    ? "border-l-red-500"
    : team.roleCount >= 1
    ? "border-l-green-500"
    : "border-l-edge";

  return (
    <div className={`bg-surface border border-edge border-l-4 ${accentClass} rounded-xl overflow-hidden`}>
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-start gap-3 p-4 hover:bg-surface-raised transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-semibold text-sm truncate">{team.name}</span>
            <VelocityBadge roleCount={team.roleCount} />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {team.brokerage && (
              <span className="flex items-center gap-1 text-fg2 text-xs">
                <Building2 size={10} className="shrink-0" />
                {team.brokerage}
              </span>
            )}
            {team.location && (
              <span className="flex items-center gap-1 text-fg3 text-xs">
                <MapPin size={10} className="shrink-0" />
                {team.location}
              </span>
            )}
            {team.roleCount > 0 && (
              <span className="text-xs text-fg2">
                {team.roleCount} active {team.roleCount === 1 ? "role" : "roles"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {team.website && (
            <a
              href={team.website.startsWith("http") ? team.website : `https://${team.website}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-fg3 hover:text-indigo-400 transition-colors"
            >
              <ExternalLink size={13} />
            </a>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(team.id, team.name); }}
            disabled={deletingId === team.id}
            className="text-fg3 hover:text-red-400 disabled:opacity-40 transition-colors"
          >
            <Trash2 size={13} />
          </button>
          {expanded
            ? <ChevronDown  size={13} className="text-fg3" />
            : <ChevronRight size={13} className="text-fg3" />}
        </div>
      </button>

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

const FIELD_DEFS = [
  { label: "Team Name *",  key: "name",      placeholder: "e.g. The Smith Group", required: true },
  { label: "Brokerage",   key: "brokerage",  placeholder: "e.g. Keller Williams" },
  { label: "Location",    key: "location",   placeholder: "e.g. Austin, TX" },
  { label: "Website",     key: "website",    placeholder: "https://example.com" },
] as const;

export function Top100Client({ teams: initial }: { teams: Team[] }) {
  const [teams,      setTeams]      = useState(initial);
  const [tab,        setTab]        = useState<"matched" | "unmatched">("matched");
  const [showDrawer, setShowDrawer] = useState(false);
  const [form,       setForm]       = useState({ name: "", brokerage: "", location: "", website: "" });
  const [saving,     setSaving]     = useState(false);
  const [addError,   setAddError]   = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const router = useRouter();

  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDrawer) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowDrawer(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showDrawer]);

  const matched   = teams.filter((t) => t.isMatched || t.roleCount > 0);
  const unmatched = teams.filter((t) => !t.isMatched && t.roleCount === 0);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setAddError("Team name is required."); return; }
    setSaving(true); setAddError("");
    try {
      const res = await fetch("/api/top100/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setAddError(d.error ?? "Failed to add team.");
      } else {
        const team = await res.json() as Team;
        setTeams((t) => [...t, { ...team, roleCount: 0 }]);
        setForm({ name: "", brokerage: "", location: "", website: "" });
        setShowDrawer(false);
        router.refresh();
      }
    } catch {
      setAddError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Remove "${name}" from the list?`)) return;
    setDeletingId(id);
    try {
      await fetch(`/api/top100/${id}`, { method: "DELETE" });
      setTeams((t) => t.filter((team) => team.id !== id));
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* ── Slide-in drawer ─────────────────────────────────────────────────── */}
      {showDrawer && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setShowDrawer(false)}
        />
      )}
      <div
        ref={drawerRef}
        className={`fixed inset-y-0 right-0 z-50 w-[380px] bg-surface border-l border-edge shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          showDrawer ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-edge">
          <h2 className="text-white font-semibold">Add Team</h2>
          <button
            type="button"
            onClick={() => setShowDrawer(false)}
            className="text-fg3 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleAdd} className="flex-1 flex flex-col px-6 py-5 gap-4 overflow-y-auto">
          {FIELD_DEFS.map(({ label, key, placeholder, required }) => (
            <div key={key}>
              <label className="block text-fg2 text-xs mb-1.5">{label}</label>
              <input
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                required={required ?? false}
                className="w-full bg-surface-raised border border-edge rounded-lg px-3 py-2 text-white text-sm placeholder-fg3 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          ))}
          {addError && <p className="text-red-400 text-sm">{addError}</p>}
          <div className="mt-auto flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              {saving ? "Adding…" : "Add Team"}
            </button>
            <button
              type="button"
              onClick={() => setShowDrawer(false)}
              className="px-4 py-2 text-sm text-fg2 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* ── Header row ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-surface border border-edge rounded-lg p-1">
          {(["matched", "unmatched"] as const).map((t) => {
            const count = t === "matched" ? matched.length : unmatched.length;
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-surface-raised text-white"
                    : "text-fg2 hover:text-white"
                }`}
              >
                <span className="capitalize">{t}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${
                  active ? "bg-indigo-500/20 text-indigo-400" : "bg-surface-raised text-fg3"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowDrawer(true)}
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={14} /> Add Team
        </button>
      </div>

      {/* ── Matched tab ─────────────────────────────────────────────────────── */}
      {tab === "matched" && (
        <>
          {matched.length === 0 ? (
            <div className="bg-surface border border-edge rounded-xl py-12 text-center">
              <Flame size={28} className="text-fg3 mx-auto mb-3" />
              <p className="text-fg2 text-sm">No matched teams yet — run a scrape to find hiring signals</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {matched.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  onDelete={handleDelete}
                  deletingId={deletingId}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Unmatched tab ───────────────────────────────────────────────────── */}
      {tab === "unmatched" && (
        <>
          {unmatched.length === 0 ? (
            <div className="bg-surface border border-edge rounded-xl py-12 text-center">
              <p className="text-fg2 text-sm">All teams have been matched — great coverage!</p>
            </div>
          ) : (
            <div className="bg-surface border border-edge rounded-xl overflow-hidden">
              <div className="divide-y divide-edge">
                {unmatched.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-raised transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{team.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {team.brokerage && (
                          <span className="flex items-center gap-1 text-fg3 text-xs">
                            <Building2 size={10} className="shrink-0" />
                            {team.brokerage}
                          </span>
                        )}
                        {team.location && (
                          <span className="flex items-center gap-1 text-fg3 text-xs">
                            <MapPin size={10} className="shrink-0" />
                            {team.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-fg3 text-xs">No postings found</span>
                      <span className="text-fg3 text-xs">{timeAgo(team.createdAt)}</span>
                      {team.website && (
                        <a
                          href={team.website.startsWith("http") ? team.website : `https://${team.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-fg3 hover:text-indigo-400 transition-colors"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(team.id, team.name)}
                        disabled={deletingId === team.id}
                        className="text-fg3 hover:text-red-400 disabled:opacity-40 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
