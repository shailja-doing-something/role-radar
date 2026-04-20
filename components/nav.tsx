"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  Trophy,
  Database,
  Briefcase,
  Zap,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href:  string;
  label: string;
  icon:  LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Primary",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/postings",  label: "Postings",  icon: Briefcase },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/patterns", label: "Patterns", icon: TrendingUp },
      { href: "/signals",  label: "Signals",  icon: Zap },
    ],
  },
  {
    label: "Accounts",
    items: [
      { href: "/top100", label: "Top 100 Teams", icon: Trophy },
    ],
  },
  {
    label: "Config",
    items: [
      { href: "/sources", label: "Sources", icon: Database },
    ],
  },
];

export function Nav() {
  const pathname    = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav
      className={`shrink-0 bg-surface border-r border-edge flex flex-col h-screen sticky top-0 transition-all duration-200 ${
        collapsed ? "w-[60px]" : "w-[240px]"
      }`}
    >
      {/* Logo */}
      <div
        className={`flex items-center h-16 shrink-0 border-b border-edge ${
          collapsed ? "justify-center px-0" : "gap-2.5 px-6"
        }`}
      >
        <span className="w-[18px] h-[18px] rounded-full bg-primary shrink-0 flex items-center justify-center" />
        {!collapsed && (
          <span className="text-ink font-bold text-[16px] tracking-tight">
            RoleRadar
          </span>
        )}
      </div>

      {/* Nav groups */}
      <div className="flex-1 px-2 py-4 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? "mt-5" : ""}>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-fg3 px-3 mb-1.5 select-none">
                {group.label}
              </p>
            )}
            {collapsed && gi > 0 && (
              <div className="border-t border-edge mx-1 mb-3" />
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    className={[
                      "flex items-center gap-2.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                      collapsed
                        ? "justify-center px-2"
                        : "border-l-2 pl-[10px] pr-3",
                      active
                        ? collapsed
                          ? "bg-primary-soft text-primary"
                          : "border-primary bg-primary-soft text-primary font-semibold"
                        : collapsed
                          ? "text-fg2 hover:bg-surface-raised hover:text-ink border-transparent"
                          : "border-transparent text-fg2 hover:bg-surface-raised hover:text-ink",
                    ].join(" ")}
                  >
                    <Icon size={16} className="shrink-0" />
                    {!collapsed && label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Collapse toggle */}
      <div className="px-2 py-3 border-t border-edge shrink-0">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex items-center gap-2 py-2 rounded-lg text-fg3 hover:bg-surface-raised hover:text-fg2 transition-colors w-full ${
            collapsed ? "justify-center px-0" : "px-3"
          }`}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </nav>
  );
}
