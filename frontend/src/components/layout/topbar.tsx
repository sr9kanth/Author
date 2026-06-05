"use client";

import { usePathname } from "next/navigation";
import { Search, Bell, Sun, Moon, ChevronRight, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { resetTour } from "@/components/layout/onboarding-tour";

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/frameworks": "Frameworks",
  "/knowledge": "Knowledge",
  "/generate": "Generate",
  "/review": "Review",
  "/repository": "Repository",
  "/assembly": "Assembly",
  "/configurations": "Configurations",
};

export function Topbar() {
  const pathname = usePathname();
  const label = PAGE_LABELS[pathname] ?? "";
  const [dark, setDark] = useState(false);

  function toggleDark() {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center gap-4 px-5 sm:px-8 bg-[var(--paper)]/85 backdrop-blur-md border-b border-stone-200/70 dark:border-white/[0.06]">
      <div className="flex items-center gap-2 text-sm min-w-0">
        <span className="text-stone-400 dark:text-stone-500 hidden sm:inline">AIP</span>
        <ChevronRight size={14} className="text-stone-300 dark:text-stone-600 hidden sm:inline" />
        <span className="font-medium text-stone-800 dark:text-stone-100 truncate">{label}</span>
      </div>

      <div className="flex-1" />

      <div className="relative hidden md:block w-72">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 pointer-events-none">
          <Search size={15} />
        </span>
        <input
          placeholder="Search items, frameworks…"
          className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-white/[0.04] pl-9 pr-12 py-2 text-sm text-stone-700 dark:text-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-stone-400 dark:text-stone-500 border border-stone-200 dark:border-white/10 rounded px-1.5 py-0.5">
          ⌘K
        </kbd>
      </div>

      <button
        onClick={() => { resetTour(); window.location.reload(); }}
        title="Replay tour"
        className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/[0.06] hover:text-stone-800 dark:hover:text-stone-100 transition"
      >
        <HelpCircle size={18} />
      </button>

      <button
        onClick={toggleDark}
        title={dark ? "Light mode" : "Dark mode"}
        className="w-9 h-9 inline-flex items-center justify-center rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/[0.06] hover:text-stone-800 dark:hover:text-stone-100 transition"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <button className="relative w-9 h-9 inline-flex items-center justify-center rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/[0.06] hover:text-stone-800 dark:hover:text-stone-100 transition">
        <Bell size={18} />
        <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-[var(--paper)]" />
      </button>
    </header>
  );
}
