"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Search,
  LayoutDashboard,
  Layers,
  BookOpen,
  Sparkles,
  CheckCircle,
  Database,
  Boxes,
  Settings,
  CornerDownLeft,
  type LucideIcon,
} from "lucide-react";

interface Destination {
  label: string;
  href: string;
  Icon: LucideIcon;
  keywords?: string;
}

const DESTINATIONS: Destination[] = [
  { label: "Dashboard", href: "/dashboard", Icon: LayoutDashboard },
  { label: "Frameworks", href: "/frameworks", Icon: Layers },
  { label: "Knowledge", href: "/knowledge", Icon: BookOpen, keywords: "documents sources index" },
  { label: "Generate", href: "/generate", Icon: Sparkles, keywords: "items create" },
  { label: "Review", href: "/review", Icon: CheckCircle },
  { label: "Repository", href: "/repository", Icon: Database },
  { label: "Assembly", href: "/assembly", Icon: Boxes },
  { label: "Metadata", href: "/configurations", Icon: Settings, keywords: "configurations settings" },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DESTINATIONS;
    return DESTINATIONS.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        (d.keywords?.toLowerCase().includes(q) ?? false),
    );
  }, [query]);

  // Reset state and focus input when opened.
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      // Focus after the element is mounted/visible.
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Keep selection in bounds when results change.
  useEffect(() => {
    setSelected((s) => (s >= results.length ? 0 : s));
  }, [results.length]);

  if (!open) return null;

  const go = (dest: Destination | undefined) => {
    if (!dest) return;
    onClose();
    router.push(dest.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => (results.length ? (s + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => (results.length ? (s - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[selected]);
    }
  };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Command palette">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/30 dark:bg-black/50 backdrop-blur-[2px]"
      />

      {/* Modal */}
      <div className="absolute left-1/2 top-[18vh] -translate-x-1/2 w-[92vw] max-w-lg">
        <div
          onKeyDown={onKeyDown}
          className="overflow-hidden rounded-2xl bg-white dark:bg-stone-950 border border-stone-200/80 dark:border-white/[0.08] shadow-2xl"
        >
          {/* Search field */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-100 dark:border-white/[0.06]">
            <Search size={17} className="text-stone-400 dark:text-stone-500 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(0);
              }}
              placeholder="Go to…"
              className="flex-1 bg-transparent text-sm text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none"
            />
            <kbd className="text-[10px] font-medium text-stone-400 dark:text-stone-500 border border-stone-200 dark:border-white/10 rounded px-1.5 py-0.5">
              Esc
            </kbd>
          </div>

          {/* Results */}
          <ul className="max-h-80 overflow-y-auto py-1.5">
            {results.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-stone-400 dark:text-stone-500">
                No matches
              </li>
            ) : (
              results.map((d, i) => {
                const on = i === selected;
                return (
                  <li key={d.href}>
                    <button
                      type="button"
                      onClick={() => go(d)}
                      onMouseEnter={() => setSelected(i)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition",
                        on
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-200"
                          : "text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-white/[0.03]",
                      )}
                    >
                      <d.Icon size={16} className={on ? "text-indigo-500" : "text-stone-400 dark:text-stone-500"} />
                      <span className="flex-1 font-medium">{d.label}</span>
                      {on && <CornerDownLeft size={14} className="text-indigo-400" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
