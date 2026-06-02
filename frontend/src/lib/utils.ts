import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    running: "bg-blue-100 text-blue-800",
    processing: "bg-blue-100 text-blue-800",
    processed: "bg-green-100 text-green-800",
    completed: "bg-green-100 text-green-800",
    approved: "bg-green-100 text-green-800",
    published: "bg-purple-100 text-purple-800",
    failed: "bg-red-100 text-red-800",
    draft: "bg-gray-100 text-gray-800",
    under_review: "bg-orange-100 text-orange-800",
    validated: "bg-teal-100 text-teal-800",
    archived: "bg-gray-200 text-gray-600",
    uploaded: "bg-sky-100 text-sky-800",
  };
  return map[status] ?? "bg-gray-100 text-gray-700";
}
