"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
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
interface RolePoint   { role: string; count: number; pct: number }

export function VolumeChart({ data }: { data: VolumePoint[] }) {
  if (data.length === 0)
    return <ChartEmpty text="No posting activity in the last 30 days" />;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
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
        <Bar dataKey="count" name="Postings" fill="#6366F1" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RolesChart({ data }: { data: RolePoint[] }) {
  if (data.length === 0)
    return <ChartEmpty text="No role data yet — run a scrape" />;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
      >
        <XAxis
          type="number"
          tick={{ fill: "#4A4A60", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="role"
          tick={{ fill: "#8B8BA0", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={118}
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value) => [`${value}`, "Postings"]}
        />
        <Bar
          dataKey="count"
          name="Postings"
          fill="#6366F1"
          radius={[0, 3, 3, 0]}
          maxBarSize={16}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChartEmpty({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-[180px]">
      <p className="text-fg3 text-sm">{text}</p>
    </div>
  );
}
