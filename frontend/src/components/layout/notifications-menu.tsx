"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { dashboardApi } from "@/lib/api";
import type { ActivityItem } from "@/types";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(then).toLocaleDateString();
}

function kindTint(kind: string): string {
  switch (kind) {
    case "generate":
      return "bg-indigo-500";
    case "review":
      return "bg-amber-500";
    case "knowledge":
      return "bg-emerald-500";
    case "framework":
      return "bg-sky-500";
    default:
      return "bg-stone-400";
  }
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [seen, setSeen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await dashboardApi.activity(10);
      setItems(res.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }

  function toggle() {
    setOpen((o) => {
      const next = !o;
      if (next) {
        setSeen(true);
        if (!loaded) void load();
      }
      return next;
    });
  }

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const showDot = !seen && items.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggle}
        title="Notifications"
        aria-label="Notifications"
        className="relative w-9 h-9 inline-flex items-center justify-center rounded-xl text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/[0.06] hover:text-stone-800 dark:hover:text-stone-100 transition"
      >
        <Bell size={18} />
        {showDot && (
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-[var(--paper)]" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl bg-white dark:bg-[#111115] border border-stone-200 dark:border-white/[0.08] shadow-lg z-50"
        >
          <div className="px-4 py-3 border-b border-stone-100 dark:border-white/[0.06]">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-white">Notifications</h3>
          </div>

          {loading ? (
            <p className="px-4 py-6 text-[13px] text-stone-400 dark:text-stone-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-stone-400 dark:text-stone-500">No recent activity</p>
          ) : (
            <ul className="py-1">
              {items.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-stone-50 dark:hover:bg-white/[0.04] transition"
                >
                  <span className={cn("mt-1.5 w-2 h-2 shrink-0 rounded-full", kindTint(a.kind))} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-stone-700 dark:text-stone-200 truncate">{a.summary}</p>
                    <p className="mt-0.5 text-[11.5px] text-stone-400 dark:text-stone-500">
                      {timeAgo(a.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
