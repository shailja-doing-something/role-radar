import { Zap, Database } from "lucide-react";

export function LiveLabel() {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border"
      style={{ background: "#F0FDF4", color: "#16A34A", borderColor: "#BBF7D0" }}
    >
      <Zap size={10} />
      LIVE
    </span>
  );
}

export function StaticLabel() {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border"
      style={{ background: "#F3F2EF", color: "#9E9E9E", borderColor: "#E5E3DF" }}
    >
      <Database size={10} />
      REALTRENDS
    </span>
  );
}
