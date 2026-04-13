"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface VolumePoint { date: string; count: number }
interface RemotePoint  { name: string; value: number; fill: string }
interface PatternPoint { keyword: string; count: number; category: string }

interface Props {
  volumeData:  VolumePoint[];
  remoteRatio: RemotePoint[];
  topPatterns: PatternPoint[];
}

export function DashboardCharts({ volumeData, remoteRatio, topPatterns }: Props) {
  const hasVolume   = volumeData.length > 0;
  const hasPatterns = topPatterns.length > 0;
  const hasRemote   = remoteRatio.some((r) => r.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Volume trend */}
      <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-4">Posting Volume (30 days)</h2>
        {hasVolume ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={volumeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#9ca3af" }}
                itemStyle={{ color: "#60a5fa" }}
                cursor={{ fill: "#1f2937" }}
              />
              <Bar dataKey="count" name="Postings" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty text="No postings in the last 30 days" />
        )}
      </div>

      {/* Remote ratio */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-4">Remote vs On-site</h2>
        {hasRemote ? (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={remoteRatio}
                cx="50%"
                cy="45%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {remoteRatio.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span style={{ color: "#9ca3af", fontSize: 12 }}>{v}</span>}
              />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: "#9ca3af" }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Empty text="No postings yet" />
        )}
      </div>

      {/* Top skills */}
      {hasPatterns && (
        <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Top Skills in Demand</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topPatterns} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="keyword"
                tick={{ fill: "#d1d5db", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={90}
              />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#9ca3af" }}
                itemStyle={{ color: "#60a5fa" }}
                cursor={{ fill: "#1f2937" }}
              />
              <Bar dataKey="count" name="Mentions" fill="#3b82f6" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-[180px]">
      <p className="text-gray-600 text-sm">{text}</p>
    </div>
  );
}
