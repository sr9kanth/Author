"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface DetailTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface DetailPanelProps {
  open: boolean;
  title: string;
  subtitle?: string;
  tabs: DetailTab[];
  onClose: () => void;
}

export function DetailPanel({ open, title, subtitle, tabs, onClose }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id ?? "");

  // Reset to first tab whenever the panel is (re)opened.
  useEffect(() => {
    if (open) setActiveTab(tabs[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const current = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  return (
    <div
      className={cn(
        "fixed inset-0 z-50",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-stone-900/30 dark:bg-black/50 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute top-0 right-0 h-full w-full sm:w-[440px] flex flex-col",
          "bg-white dark:bg-stone-950 border-l border-stone-200/80 dark:border-white/[0.08] shadow-2xl",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-stone-100 dark:border-white/[0.06]">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-stone-900 dark:text-white leading-snug line-clamp-2">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[12.5px] text-stone-400 dark:text-stone-500 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/[0.06] transition"
          >
            <X size={17} />
          </button>
        </div>

        {/* Tab bar */}
        {tabs.length > 0 && (
          <div className="flex items-center gap-1 px-3 pt-2 border-b border-stone-100 dark:border-white/[0.06]">
            {tabs.map((t) => {
              const on = t.id === current?.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    "relative px-3 py-2 text-[13px] font-medium transition",
                    on
                      ? "text-indigo-600 dark:text-indigo-300"
                      : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200",
                  )}
                >
                  {t.label}
                  {on && (
                    <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-indigo-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">{current?.content}</div>
      </div>
    </div>
  );
}

// ── useDetailPanel hook ──────────────────────────────────────────────────────
export function useDetailPanel<T>() {
  const [active, setActive] = useState<T | null>(null);
  const [open, setOpen] = useState(false);

  const openWith = (item: T) => {
    setActive(item);
    setOpen(true);
  };

  const close = () => setOpen(false);

  return { active, open, openWith, close };
}
