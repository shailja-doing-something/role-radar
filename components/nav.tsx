"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Radar,
  LayoutDashboard,
  TrendingUp,
  Trophy,
  Database,
  Settings,
  LogOut,
} from "lucide-react";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patterns", label: "Patterns", icon: TrendingUp },
  { href: "/top100", label: "Top 100 Teams", icon: Trophy },
  { href: "/sources", label: "Sources", icon: Database },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="w-64 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <Radar size={22} className="text-blue-400" />
        <span className="text-white font-bold text-lg tracking-tight">
          RoleRadar
        </span>
      </div>

      {/* Links */}
      <div className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors w-full"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </nav>
  );
}
