"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearTokens } from "@/lib/auth";
import { authApi, dashboardApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { User } from "@/types";
import {
  LayoutDashboard, Layers, Database, Sparkles, ClipboardCheck,
  Library, Package, LogOut, CheckSquare, SlidersHorizontal,
} from "lucide-react";

const NAV = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", Icon: LayoutDashboard, section: "Overview" },
  { key: "frameworks", label: "Frameworks", href: "/frameworks", Icon: Layers, section: "Content" },
  { key: "knowledge", label: "Knowledge", href: "/knowledge", Icon: Database, section: "Content" },
  { key: "generate", label: "Generate", href: "/generate", Icon: Sparkles, section: "Content", badge: "AI" },
  { key: "review", label: "Review", href: "/review", Icon: ClipboardCheck, section: "Quality" },
  { key: "repository", label: "Repository", href: "/repository", Icon: Library, section: "Quality" },
  { key: "assembly", label: "Assembly", href: "/assembly", Icon: Package, section: "Delivery" },
  { key: "metadata", label: "Metadata", href: "/metadata", Icon: SlidersHorizontal, section: "Settings" },
];

const ROLE_LABELS: Record<string, string> = {
  administrator: "Administrator",
  assessment_manager: "Assessment Manager",
  author: "Author",
  reviewer: "Reviewer",
  auditor: "Auditor",
  read_only: "Read Only",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SECTIONS = ["Overview", "Content", "Quality", "Delivery", "Settings"];

function LogoMark() {
  return (
    <span
      className="relative inline-flex items-center justify-center rounded-[11px] shrink-0"
      style={{
        width: 36,
        height: 36,
        background: "linear-gradient(145deg, #818cf8 0%, #6366f1 45%, #7c3aed 100%)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.25) inset, 0 6px 16px -6px rgba(99,102,241,0.7)",
      }}
    >
      <CheckSquare size={20} color="white" strokeWidth={2.1} />
    </span>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);

  useEffect(() => {
    authApi.me().then(setUser).catch(() => setUser(null));
    dashboardApi
      .stats()
      .then((s) => setReviewCount(s.awaiting_review))
      .catch(() => setReviewCount(null));
  }, []);

  function handleLogout() {
    clearTokens();
    router.push("/login");
  }

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[#0C0C0F] border-r border-white/[0.06] h-screen sticky top-0">
      {/* Brand */}
      <div className="px-4 h-16 flex items-center gap-3 border-b border-white/[0.05]">
        <LogoMark />
        <div className="leading-tight">
          <div className="text-[15px] font-semibold text-white tracking-tight">AIP</div>
          <div className="text-[11px] text-stone-500">Assessment Intelligence</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {SECTIONS.map((section) => {
          const items = NAV.filter((n) => n.section === section);
          if (!items.length) return null;
          return (
            <div key={section}>
              <div className="px-3 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-stone-600">
                {section}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const count =
                    item.key === "review" && reviewCount ? reviewCount : undefined;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={cn(
                        "group relative w-full flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-all duration-150",
                        active
                          ? "bg-indigo-500/15 text-white"
                          : "text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]",
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-indigo-400" />
                      )}
                      <item.Icon
                        size={18}
                        className={cn(
                          "shrink-0 transition",
                          active
                            ? "text-indigo-300"
                            : "text-stone-500 group-hover:text-stone-300",
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded-md bg-gradient-to-br from-indigo-400 to-violet-500 text-white">
                          {item.badge}
                        </span>
                      )}
                      {count != null && (
                        <span
                          className={cn(
                            "text-[11px] font-semibold min-w-[20px] text-center px-1.5 py-0.5 rounded-md",
                            active
                              ? "bg-white/15 text-white"
                              : "bg-white/[0.06] text-stone-400 group-hover:text-stone-200",
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-white/[0.05] p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.04] transition cursor-pointer group">
          <span
            className="inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0 bg-indigo-500"
            style={{ width: 34, height: 34, fontSize: 13 }}
          >
            {user ? initials(user.full_name) : "…"}
          </span>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-[13px] font-medium text-stone-100 truncate">
              {user?.full_name ?? "—"}
            </div>
            <div className="text-[11px] text-stone-500 truncate">
              {user ? ROLE_LABELS[user.role] ?? user.role : ""}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-stone-500 hover:text-stone-200 p-1 rounded-md hover:bg-white/[0.06] transition"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
