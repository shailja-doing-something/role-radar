"use client";

import { useState } from "react";
import {
  TrendingUp, TrendingDown, Minus,
  Target, MapPin, Zap, Sparkles,
  ChevronDown, ChevronRight,
} from "lucide-react";
import type { AnalysisData } from "@/lib/analysis";

interface Props {
  analysis:  AnalysisData;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "rising")    return <TrendingUp   size={13} className="text-[var(--success)] shrink-0" />;
  if (trend === "declining") return <TrendingDown size={13} className="text-[var(--danger)] shrink-0" />;
  return                            <Minus        size={13} className="text-fg3 shrink-0" />;
}

function trendClass(trend: string) {
  if (trend === "rising")    return "text-[var(--success)]";
  if (trend === "declining") return "text-[var(--danger)]";
  return "text-fg3";
}

function SectionHeader({
  icon: Icon,
  label,
  sub,
  color = "text-primary",
}: {
  icon:   React.ElementType;
  label:  string;
  sub?:   string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={14} className={color} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg2">{label}</p>
      {sub && <span className="text-xs text-fg3 ml-0.5">{sub}</span>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function PatternsClient({ analysis, createdAt }: Props) {
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const {
    summary            = "",
    roleDemand         = [],
    geographicHotspots = [],
    emergingSignals    = [],
    felloOpportunities = [],
  } = analysis;

  const lastRun = new Date(createdAt).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  return (
    <div className="space-y-8">

      {/* ── Intelligence Summary ──────────────────────────────────────────── */}
      {summary && (
        <section className="bg-surface border border-edge rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg2">
              AI Analysis
            </span>
            <span className="ml-auto text-xs text-fg3">{lastRun}</span>
          </div>
          <p className="text-ink text-sm leading-relaxed">{summary}</p>
        </section>
      )}

      {/* ── Role Demand + Emerging Signals (two columns) ─────────────────── */}
      <div className="grid grid-cols-2 gap-6">

        {/* Left: Role Demand */}
        <div>
          <SectionHeader icon={TrendingUp} label="Role Demand" />
          {roleDemand.length === 0 ? (
            <div className="bg-surface border border-edge rounded-xl py-8 text-center">
              <p className="text-fg3 text-sm">No role data yet</p>
            </div>
          ) : (
            <div className="bg-surface border border-edge rounded-xl overflow-hidden">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_40px_48px_80px_16px] items-center px-4 py-2.5 border-b border-edge">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3">Role</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3 text-right">Ct</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3 text-right">Shr</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg3 text-right">Trend</span>
                <span />
              </div>

              <div className="divide-y divide-edge">
                {roleDemand.map((r) => {
                  const expanded = expandedRole === r.role;
                  return (
                    <div key={r.role}>
                      <button
                        type="button"
                        onClick={() => setExpandedRole(expanded ? null : r.role)}
                        className="w-full grid grid-cols-[1fr_40px_48px_80px_16px] items-center px-4 py-3 hover:bg-surface-raised transition-colors text-left"
                      >
                        <span className="text-sm text-ink font-medium truncate pr-2">
                          {r.role}
                        </span>
                        <span className="text-sm text-ink font-medium tabular-nums text-right">
                          {r.count}
                        </span>
                        <span className="text-xs text-fg2 tabular-nums text-right">
                          {r.percentOfTotal?.toFixed(1)}%
                        </span>
                        <div className="flex items-center justify-end gap-1">
                          <TrendIcon trend={r.trend} />
                          <span className={`text-[11px] capitalize ${trendClass(r.trend)}`}>
                            {r.trend}
                          </span>
                        </div>
                        {expanded
                          ? <ChevronDown  size={13} className="text-fg3" />
                          : <ChevronRight size={13} className="text-fg3" />}
                      </button>

                      {expanded && (
                        <div className="px-4 pb-4 pt-3 border-t border-edge bg-surface-raised">
                          {r.trendReason && (
                            <p className="text-fg2 text-xs italic mb-3 leading-relaxed">
                              {r.trendReason}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-5">
                            {r.topStates?.length > 0 && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg3 mb-1.5">
                                  Top states
                                </p>
                                <div className="flex gap-1.5 flex-wrap">
                                  {r.topStates.map((s) => (
                                    <span
                                      key={s}
                                      className="bg-surface border border-edge text-fg2 text-xs px-2 py-0.5 rounded"
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {r.topCompanies?.length > 0 && (
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg3 mb-1.5">
                                  Top companies
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {r.topCompanies.map((c) => (
                                    <span
                                      key={c}
                                      className="bg-surface border border-edge text-fg2 text-xs px-2 py-0.5 rounded"
                                    >
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Emerging Signals */}
        <div>
          <SectionHeader icon={Zap} label="Emerging Signals" color="text-[var(--warning)]" />
          {emergingSignals.length === 0 ? (
            <div className="bg-surface border border-edge rounded-xl py-8 text-center">
              <p className="text-fg3 text-sm">No signals yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emergingSignals.map((sig, i) => (
                <div
                  key={i}
                  className="bg-surface border border-edge border-l-4 border-l-amber-500 rounded-xl p-4"
                >
                  <p className="text-ink text-sm font-semibold leading-snug">{sig.signal}</p>
                  <p className="text-fg2 text-xs mt-1.5 leading-relaxed">{sig.implication}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Fello Opportunities ──────────────────────────────────────────────── */}
      {felloOpportunities.length > 0 && (
        <section>
          <SectionHeader
            icon={Target}
            label="Fello Opportunities"
            sub="— Act on these now"
          />
          <div className="grid grid-cols-3 gap-4">
            {felloOpportunities.map((opp, i) => (
              <div
                key={i}
                className="bg-surface border border-edge border-l-4 border-l-primary rounded-xl p-4"
              >
                <p className="text-ink text-sm font-semibold leading-snug mb-2">
                  {opp.opportunity}
                </p>
                <p className="text-fg2 text-xs leading-relaxed">{opp.reason}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Geographic Hotspots ──────────────────────────────────────────────── */}
      {geographicHotspots.length > 0 && (
        <section>
          <SectionHeader icon={MapPin} label="Geographic Hotspots" />
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
            {geographicHotspots.map((hs) => (
              <div
                key={hs.state}
                className="bg-surface border border-edge rounded-xl p-4 shrink-0 w-52"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-ink font-semibold text-sm">{hs.state}</span>
                  <span className="text-[11px] font-semibold text-primary shrink-0">
                    {hs.totalPostings}
                  </span>
                </div>
                <p className="text-fg2 text-xs mb-1.5 leading-snug">{hs.dominantRole}</p>
                <p className="text-fg3 text-xs leading-relaxed">{hs.insight}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
