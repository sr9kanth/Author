import { cn, statusColor } from "@/lib/utils";

interface BadgeProps {
  label: string;
  status?: string;
  className?: string;
}

export function Badge({ label, status, className }: BadgeProps) {
  const colorClass = status ? statusColor(status) : "bg-gray-100 text-gray-700";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
        colorClass,
        className,
      )}
    >
      {label.replace(/_/g, " ")}
    </span>
  );
}
