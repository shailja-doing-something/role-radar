import { type ComponentProps } from "react";

export function Skeleton({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`skeleton rounded ${className}`} {...props} />;
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 border-b border-edge">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === 0 ? "w-32" : i === 1 ? "w-48" : "w-24"}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-surface border border-edge rounded-xl p-6 ${className}`}>
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-8 w-14 mb-2" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function SkeletonTable({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  );
}
