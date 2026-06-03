import { cn } from "@/lib/utils";

type ContentStatus = "draft" | "generated" | "validated" | "approved" | "published";

interface StatusMeta {
  label: string;
  dot: string;
  text: string;
  bg: string;
  ring: string;
}

const STATUS: Record<string, StatusMeta> = {
  draft: {
    label: "Draft",
    dot: "bg-stone-400",
    text: "text-stone-600 dark:text-stone-300",
    bg: "bg-stone-100 dark:bg-white/[0.06]",
    ring: "ring-stone-200/80 dark:ring-white/10",
  },
  generated: {
    label: "Generated",
    dot: "bg-violet-500",
    text: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-50 dark:bg-violet-500/10",
    ring: "ring-violet-200/80 dark:ring-violet-500/20",
  },
  validated: {
    label: "Validated",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    ring: "ring-amber-200/80 dark:ring-amber-500/20",
  },
  approved: {
    label: "Approved",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    ring: "ring-emerald-200/80 dark:ring-emerald-500/20",
  },
  published: {
    label: "Published",
    dot: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-50 dark:bg-sky-500/10",
    ring: "ring-sky-200/80 dark:ring-sky-500/20",
  },
  // knowledge asset statuses
  indexed: {
    label: "Indexed",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    ring: "ring-emerald-200/80 dark:ring-emerald-500/20",
  },
  processing: {
    label: "Processing",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    ring: "ring-amber-200/80 dark:ring-amber-500/20",
  },
  failed: {
    label: "Failed",
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-500/10",
    ring: "ring-rose-200/80 dark:ring-rose-500/20",
  },
};

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const meta = STATUS[status];
  if (!meta) return null;
  const s = size === "sm" ? "px-2 py-0.5 text-[11px] gap-1" : "px-2.5 py-0.5 text-xs gap-1.5";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium ring-1 ring-inset",
        s,
        meta.bg,
        meta.text,
        meta.ring,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function Tag({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "indigo" | "violet";
}) {
  const tones = {
    neutral: "bg-stone-100 dark:bg-white/[0.06] text-stone-600 dark:text-stone-300",
    indigo: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    violet: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
