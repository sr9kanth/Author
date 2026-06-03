import { cn } from "@/lib/utils";

export const CARD =
  "bg-white dark:bg-[#1C1B20] border border-stone-200/80 dark:border-white/[0.06] rounded-2xl";

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return <div className={cn(CARD, className)}>{children}</div>;
}

export function CardHeader({ className, children }: CardProps) {
  return (
    <div className={cn("px-5 py-4 border-b border-stone-100 dark:border-white/[0.05]", className)}>
      {children}
    </div>
  );
}

export function CardContent({ className, children }: CardProps) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function CardTitle({ className, children }: CardProps) {
  return (
    <h3 className={cn("text-sm font-semibold text-stone-900 dark:text-white", className)}>
      {children}
    </h3>
  );
}
