"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  CreditCard,
  FolderKanban,
  Home,
  Import,
  ListChecks,
  Map,
  ClipboardCheck,
  Plug,
  FlaskConical,
  FolderSearch,
  Search,
  Settings,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/review", label: "Review Needed", icon: ClipboardCheck },
  { href: "/local-scan", label: "Local Scan", icon: FolderSearch },
  { href: "/import", label: "Import Suggestions", icon: Import },
  { href: "/suggestions", label: "Suggestions", icon: ListChecks },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/mock-runs", label: "Mock Runs", icon: FlaskConical },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/relationships", label: "Relationships", icon: Boxes },
  { href: "/map", label: "Visual Map", icon: Map },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-slate-200 bg-white lg:min-h-screen lg:w-64 lg:border-r">
      <div className="border-b border-slate-200 px-4 py-4 lg:px-6">
        <Link href="/" className="block">
          <div className="text-lg font-semibold text-slate-950">StackMap</div>
          <div className="text-xs text-slate-500">Local reference dashboard</div>
        </Link>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-3 py-3 lg:block lg:space-y-1 lg:overflow-visible">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-fit items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
