"use client";
import { cn } from "@/lib/utils";
import { Search, TrendingUp, TrendingDown, ChevronUp, ChevronDown, type LucideIcon } from "lucide-react";
import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { CARD } from "./card";

// ── StatsCard ───────────────────────────────────────────────────────────────
type Accent = "indigo" | "violet" | "emerald" | "amber";

const accentMap: Record<Accent, string> = {
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
};

export function StatsCard({
  Icon: IconComp,
  label,
  value,
  trend,
  trendDir = "up",
  sub,
  accent = "indigo",
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
  trendDir?: "up" | "down";
  sub?: string;
  accent?: Accent;
}) {
  const up = trendDir === "up";
  return (
    <div className={cn(CARD, "p-5 flex flex-col gap-3.5")}>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center justify-center w-9 h-9 rounded-xl",
            accentMap[accent],
          )}
        >
          <IconComp size={18} />
        </span>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold",
              up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400",
            )}
          >
            {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend}
          </span>
        )}
      </div>
      <div>
        <div className="text-[28px] leading-none font-semibold tracking-tight text-stone-900 dark:text-white tabular-nums">
          {value}
        </div>
        <div className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">{label}</div>
      </div>
      {sub && <div className="text-xs text-stone-400 dark:text-stone-500">{sub}</div>}
    </div>
  );
}

// ── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-stone-900 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 max-w-2xl">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({
  Icon: IconComp,
  title,
  subtext,
  action,
}: {
  Icon: LucideIcon;
  title: string;
  subtext?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="relative mb-5">
        <div className="absolute inset-0 blur-2xl bg-indigo-400/20 dark:bg-indigo-500/20 rounded-full" />
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-stone-50 to-stone-100 dark:from-white/[0.07] dark:to-white/[0.02] border border-stone-200/80 dark:border-white/10 flex items-center justify-center text-indigo-500 dark:text-indigo-300">
          <IconComp size={26} />
        </div>
      </div>
      <h3 className="text-base font-semibold text-stone-900 dark:text-white">{title}</h3>
      {subtext && (
        <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400 max-w-sm">{subtext}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── SearchInput ───────────────────────────────────────────────────────────────
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const inputCls =
    "w-full rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3.5 py-2.5 text-sm text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-500/60 transition";
  return (
    <div className={cn("relative", className)}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 pointer-events-none">
        <Search size={16} />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputCls, "pl-9 py-2")}
      />
    </div>
  );
}

// ── Segmented ───────────────────────────────────────────────────────────────
export function Segmented({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: Array<{ value: string; label: string } | string>;
  value: string;
  onChange: (v: string) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl p-0.5 bg-stone-100 dark:bg-white/[0.05] border border-stone-200/70 dark:border-white/[0.06]">
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        const active = v === value;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              "rounded-[9px] font-medium transition whitespace-nowrap",
              size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]",
              active
                ? "bg-white dark:bg-white/[0.10] text-stone-900 dark:text-white shadow-sm"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── FileUploadZone ───────────────────────────────────────────────────────────
export function FileUploadZone({ onFiles }: { onFiles?: (names: string[]) => void }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handle = (files: FileList | null) => {
    if (onFiles && files && files.length) onFiles(Array.from(files).map((f) => f.name));
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "group relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 px-6 py-10 text-center",
        drag
          ? "border-indigo-400 bg-indigo-50/70 dark:bg-indigo-500/10 scale-[1.005]"
          : "border-stone-300/80 dark:border-white/15 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-stone-50/60 dark:hover:bg-white/[0.02]",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
      <div
        className={cn(
          "mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center transition",
          drag
            ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300"
            : "bg-stone-100 dark:bg-white/[0.06] text-stone-500 dark:text-stone-400 group-hover:text-indigo-500",
        )}
      >
        <Upload size={24} />
      </div>
      <p className="text-sm font-medium text-stone-800 dark:text-stone-100">
        {drag ? "Drop files to upload" : "Drag & drop files here, or click to browse"}
      </p>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        PDF, DOCX, PPTX, EPUB — up to 50 MB each
      </p>
    </div>
  );
}
