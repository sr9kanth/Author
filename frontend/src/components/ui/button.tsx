"use client";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  Icon?: LucideIcon;
  IconRight?: LucideIcon;
}

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const sizes: Record<Size, string> = {
  sm: "text-[13px] px-3 py-1.5",
  md: "text-sm px-3.5 py-2",
  lg: "text-sm px-4 py-2.5",
};

const variants: Record<Variant, string> = {
  primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20",
  secondary:
    "bg-white dark:bg-white/[0.05] border border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-white/[0.09]",
  ghost: "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/[0.06]",
  danger:
    "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/20",
};

export function Button({
  variant = "primary",
  size = "md",
  Icon,
  IconRight,
  children,
  className,
  ...rest
}: ButtonProps) {
  const iconSize = size === "sm" ? 15 : 16;
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...rest}>
      {Icon && <Icon size={iconSize} />}
      {children}
      {IconRight && <IconRight size={iconSize} />}
    </button>
  );
}
