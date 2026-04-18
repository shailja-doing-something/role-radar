"use client";

import { useState, useEffect } from "react";
import { BarChart2, Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const TOOLTIP_STYLE = {
  contentStyle: {
    background:   "#13131A",
    border:       "1px solid #2A2A3A",
    borderRadius: 8,
    fontSize:     12,
    color:        "#F1F1F5",
  },
  labelStyle: { color: "#8B8BA0" },
  itemStyle:  { color: "#818CF8" },
  cursor:     { fill: "#1C1C27" },
};

interface VolumePoint { date: string; count: number }
interface RolePoint   { role: string; count: number; pct: number; topCompanies?: string[] }

// ── Volume chart ──────────────────────────────────────────────────────────────

function VolumeEmpty() {
  const [loading, setLoading] = useState(false);

  async function trigger() {
    if (loading) return;
    setLoading(true);
    await fetch("/api/scrape/trigger", { method: "POST" }).catch(() => {});
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center justify-center h-[180px] text-center gap-3">
      <BarChart2 size={32} className="text-fg3" />
      <div>
        <p className="text-white text-sm font-medium mb-1">Not enough data yet</p>
        <p className="text-fg3 text-xs leading-relaxed max-w-[200px]">
          Run a few scrapes to start seeing posting volume trends.
        </p>
      </div>
      <button
        type="button"
        onClick={trigger}
        disabled={loading}
        className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
      >
        {loading && <Loader2 size={11} className="animate-spin" />}
        {loading ? "Starting…" : "Run Scrape Now"}
      </button>
    </div>
  );
}

export function VolumeChart({ data }: { data: VolumePoint[] }) {
  if (data.length < 3) return <VolumeEmpty />;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -24, bottom: 0 }} barSize={24}>
        <CartesianGrid vertical={false} stroke="#2A2A3A" strokeDasharray="0" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#4A4A60", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "#4A4A60", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip {...TOOLTIP_STYLE} />
        <Bar dataKey="count" name="Postings" fill="#6366F1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Roles chart (custom HTML) ──────────────────────────────────────────────────

export function RolesChart({ data }: { data: RolePoint[] }) {
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  if (data.length === 0)
    return <ChartEmpty text="No role data yet — run a scrape" />;

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="flex flex-col gap-2">
      {data.map((item, i) => {
        const barWidth    = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
        const rankOpacity = data.length > 1 ? 1.0 - (i / (data.length - 1)) * 0.6 : 1;
        const isOther     = item.role.startsWith("Other: ");
        const displayRole = isOther ? item.role.slice(7) : item.role;
        const isHovered   = hovered === i;

        return (
          <div
            key={i}
            className="relative flex items-center gap-3 rounded-lg px-2 cursor-pointer"
            style={{
              height:     44,
              background: isHovered ? "#1C1C27" : "transparent",
              transition: "background 150ms",
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* ── Label ─────────────────────────────────────────────────── */}
            <div
              className="text-right shrink-0 flex items-center justify-end gap-1.5 overflow-hidden"
              style={{ width: 175 }}
            >
              {isOther && (
                <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide bg-surface-raised border border-edge text-fg3 px-1 py-px rounded">
                  Other
                </span>
              )}
              <span
                className="text-xs text-fg2 whitespace-nowrap overflow-hidden block"
                style={{ textOverflow: "ellipsis" }}
                title={displayRole}
              >
                {displayRole}
              </span>
            </div>

            {/* ── Bar track + animated fill ─────────────────────────────── */}
            <div className="flex-1 relative" style={{ height: 12 }}>
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: "#1C1C27" }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width:      mounted ? `${barWidth}%` : "0%",
                  transition: `width 600ms ease-out ${i * 100}ms`,
                  background: `rgba(99, 102, 241, ${isHovered ? 1 : rankOpacity})`,
                }}
              />
            </div>

            {/* ── Count + pct ───────────────────────────────────────────── */}
            <div className="text-right shrink-0" style={{ width: 60 }}>
              <span className="text-xs text-fg2 font-medium tabular-nums">{item.count}</span>
              <span className="text-xs text-fg3 ml-0.5">({item.pct}%)</span>
            </div>

            {/* ── Tooltip — positioned ABOVE the hovered row ────────────── */}
            {isHovered && (
              <div
                className="absolute z-50 pointer-events-none"
                style={{
                  bottom:       "calc(100% + 8px)",
                  right:        0,
                  width:        220,
                  background:   "#13131A",
                  border:       "1px solid #2A2A3A",
                  borderRadius: 8,
                  padding:      12,
                  boxShadow:    "0 8px 32px rgba(0,0,0,0.5)",
                }}
              >
                <p className="text-white text-[13px] font-semibold mb-0.5 leading-snug">
                  {displayRole}
                </p>
                <p className="text-[#8B8BA0] text-[11px]">
                  {item.count} postings · {item.pct}% of total
                </p>
                {item.topCompanies && item.topCompanies.length > 0 && (
                  <>
                    <div className="border-t border-[#2A2A3A] my-2" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#4A4A60] mb-1.5">
                      Top companies
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {item.topCompanies.map((c) => (
                        <span
                          key={c}
                          className="text-[10px] px-1.5 py-px rounded text-[#8B8BA0]"
                          style={{
                            background:   "#1C1C27",
                            border:       "1px solid #2A2A3A",
                            borderRadius: 4,
                          }}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Shared empty state ─────────────────────────────────────────────────────────

function ChartEmpty({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-[180px]">
      <p className="text-fg3 text-sm">{text}</p>
    </div>
  );
}
