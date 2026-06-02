"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { navItems } from "@/components/layout/nav-items";
import { clearTokens } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearTokens();
    router.push("/login");
  }

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <span className="text-lg font-bold tracking-tight text-white">AIP</span>
        <span className="block text-xs text-gray-400 mt-0.5">Assessment Intelligence Platform</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-brand-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white",
              )}
            >
              <span className="w-5 h-5 shrink-0 opacity-80" aria-hidden>
                {/* Icon placeholder – replace with Heroicons SVG */}
                &#9632;
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-700 px-4 py-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <span className="w-5 h-5 opacity-70" aria-hidden>&#x21AA;</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
