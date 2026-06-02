export interface NavItem {
  label: string;
  href: string;
  icon: string; // Heroicons name or SVG path stub
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "home" },
  { label: "Knowledge", href: "/knowledge", icon: "book-open" },
  { label: "Frameworks", href: "/frameworks", icon: "academic-cap" },
  { label: "Configurations", href: "/configurations", icon: "adjustments-horizontal" },
  { label: "Generate", href: "/generate", icon: "sparkles" },
  { label: "Review", href: "/review", icon: "clipboard-document-check" },
  { label: "Repository", href: "/repository", icon: "archive-box" },
  { label: "Assembly", href: "/assembly", icon: "document-text" },
];
