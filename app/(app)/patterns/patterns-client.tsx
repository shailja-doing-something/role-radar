"use client";

import { useState } from "react";
import {
  TrendingUp, TrendingDown, Minus,
  Target, AlertTriangle, MapPin,
  ChevronDown, ChevronRight,
} from "lucide-react";
import type { AnalysisData } from "@/lib/analysis";

interface Props {
  analysis: AnalysisData;
  createdAt: string;
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "rising")    return <TrendingUp   size={13} className="text-green-400 shrink-0" />;
  if (trend === "declining") return <TrendingDown size={13} className="text-red-400   shrink-0" />;
  return                            <Minus        size={13} className="text-gray-500  shrink-0" />;
}

function trendClass(trend: string) {
  if (trend === "rising")    return "text-green-400";
  if (trend === "declining") return "text-red-400";
  return "text-gray-500";
}

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
    <div className="space-y-7">
      {/* Timestamp */}
      <p className="text-gray-600 text-xs -mt-2">Last analysis: {lastRun}</p>

      {/* ── Summary ──────────────────────────────────────────────────────── */}
      {summary && (
        <section className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-6">
          <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Market Summary
          </p>
          <p className="text-gray-200 text-sm leading-relaxed">{summary}</p>
        </section>
      )}

      {/* ── Fello Opportunities ──────────────────────────────────────────── */}
      {felloOpportunities.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-white font-semibold mb-3">
            <Target size={16} className="text-amber-400" />
            Fello Opportunities
            <span className="text-xs text-amber-700 font-normal ml-1">Act on these now</span>
          </h2>
          <div className="space-y-3">
            {felloOpportunities.map((opp, i) => (
              <div
                key={i}
                className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-4"
              >
                <p className="text-amber-300 text-sm font-medium leading-snug">{opp.opportunity}</p>
                <p className="text-amber-700/80 text-xs mt-1.5 leading-relaxed">{opp.reason}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Emerging Signals ─────────────────────────────────────────────── */}
      {emergingSignals.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-white font-semibold mb-3">
            <AlertTriangle size={16} className="text-yellow-400" />
            Emerging Signals
          </h2>
          <div className="space-y-3">
            {emergingSignals.map((sig, i) => (
              <div
                key={i}
                className="bg-yellow-950/20 border border-yellow-800/30 rounded-xl p-4"
              >
                <p className="text-yellow-200 text-sm font-medium leading-snug">{sig.signal}</p>
                <p className="text-yellow-700/80 text-xs mt-1.5 leading-relaxed">{sig.implication}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Role Demand ──────────────────────────────────────────────────── */}
      {roleDemand.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-white font-semibold mb-3">
            <TrendingUp size={16} className="text-blue-400" />
            Role Demand
          </h2>

          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 pb-2 text-gray-600 text-xs uppercase tracking-wider">
            <span className="flex-1">Role</span>
            <span className="w-10 text-right">Count</span>
            <span className="w-12 text-right">Share</span>
            <span className="w-20 text-right pr-1">Trend</span>
            <span className="w-4" />
          </div>

          <div className="space-y-1.5">
            {roleDemand.map((r) => {
              const expanded = expandedRole === r.role;
              return (
                <div
                  key={r.role}
                  className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
                >
                  {/* Summary row — click to expand */}
                  <button
                    type="button"
                    onClick={() => setExpandedRole(expanded ? null : r.role)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/50 transition-colors"
                  >
                    <span className="flex-1 text-gray-200 text-sm">{r.role}</span>
                    <span className="w-10 text-right text-gray-300 text-sm font-medium tabular-nums">
                      {r.count}
                    </span>
                    <span className="w-12 text-right text-gray-500 text-xs tabular-nums">
                      {r.percentOfTotal?.toFixed(1)}%
                    </span>
                    <div className="w-20 flex items-center justify-end gap-1">
                      <TrendIcon trend={r.trend} />
                      <span className={`text-xs capitalize ${trendClass(r.trend)}`}>
                        {r.trend}
                      </span>
                    </div>
                    {expanded
                      ? <ChevronDown  size={14} className="text-gray-600 shrink-0" />
                      : <ChevronRight size={14} className="text-gray-600 shrink-0" />}
                  </button>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-800">
                      <p className="text-gray-400 text-xs italic mb-3 leading-relaxed">
                        {r.trendReason}
                      </p>
                      <div className="flex flex-wrap gap-6">
                        {r.topStates?.length > 0 && (
                          <div>
                            <p className="text-gray-600 text-xs uppercase tracking-wide mb-1.5">
                              Top states
                            </p>
                            <div className="flex gap-1.5">
                              {r.topStates.map((s) => (
                                <span
                                  key={s}
                                  className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {r.topCompanies?.length > 0 && (
                          <div>
                            <p className="text-gray-600 text-xs uppercase tracking-wide mb-1.5">
                              Top companies
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {r.topCompanies.map((c) => (
                                <span
                                  key={c}
                                  className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded"
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
        </section>
      )}

      {/* ── Geographic Hotspots ──────────────────────────────────────────── */}
      {geographicHotspots.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-white font-semibold mb-3">
            <MapPin size={16} className="text-blue-400" />
            Geographic Hotspots
          </h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
            {geographicHotspots.map((hs, i) => (
              <div key={hs.state} className="flex items-start gap-4 px-4 py-3">
                <span className="text-gray-600 text-xs w-5 shrink-0 pt-0.5 font-medium">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-gray-200 text-sm font-medium">{hs.state}</span>
                    <span className="text-blue-400 text-xs font-medium">
                      {hs.totalPostings} postings
                    </span>
                    <span className="text-gray-600 text-xs">{hs.dominantRole}</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{hs.insight}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
