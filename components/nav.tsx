"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  Radar,
  LayoutDashboard,
  TrendingUp,
  Trophy,
  Database,
  Settings,
  LogOut,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const LINKS = [
  { href: "/dashboard", label: "Dashboard",    icon: LayoutDashboard },
  { href: "/postings",  label: "Postings",      icon: Briefcase },
  { href: "/patterns",  label: "Patterns",      icon: TrendingUp },
  { href: "/top100",    label: "Top 100 Teams", icon: Trophy },
  { href: "/sources",   label: "Sources",       icon: Database },
  { href: "/settings",  label: "Settings",      icon: Settings },
] as const;

export function Nav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav
      className={`shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0 transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center border-b border-gray-800 ${collapsed ? "justify-center px-0 py-5" : "gap-3 px-6 py-5"}`}>
        <Radar size={22} className="text-blue-400 shrink-0" />
        {!collapsed && (
          <span className="text-white font-bold text-lg tracking-tight">
            RoleRadar
          </span>
        )}
      </div>

      {/* Links */}
      <div className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </div>

      {/* Bottom: sign out + collapse toggle */}
      <div className="px-2 py-4 border-t border-gray-800 space-y-1">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "Sign out" : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors w-full ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut size={17} className="shrink-0" />
          {!collapsed && "Sign out"}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-800 hover:text-gray-300 transition-colors w-full ${
            collapsed ? "justify-center" : ""
          }`}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </nav>
  );
}
