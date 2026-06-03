import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export const INPUT_CLS =
  "w-full rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-3.5 py-2.5 text-sm text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-500/60 transition";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-[13px] font-medium text-stone-700 dark:text-stone-200">
          {label}
        </label>
      )}
      <input id={id} {...props} className={cn(INPUT_CLS, className)} />
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
