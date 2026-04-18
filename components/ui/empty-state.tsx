import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon:     LucideIcon;
  headline: string;
  subline:  string;
  action?: {
    label:   string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, headline, subline, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-surface-raised border border-edge flex items-center justify-center mb-4">
        <Icon size={22} className="text-fg3" />
      </div>
      <h3 className="text-white font-semibold text-[15px] mb-1.5">{headline}</h3>
      <p className="text-fg2 text-sm leading-relaxed max-w-xs">{subline}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
