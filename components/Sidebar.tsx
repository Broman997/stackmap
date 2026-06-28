"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  CreditCard,
  FolderKanban,
  Home,
  Map,
  ClipboardCheck,
  Search,
  Settings,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/search", label: "Find", icon: Search },
  { href: "/review", label: "Checklist", icon: ClipboardCheck },
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
    <aside className="bg-slate-900 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:self-start lg:overflow-y-auto">
      <div className="border-b border-slate-800 px-4 py-5 lg:px-6">
        <Link href="/" className="block">
          <div className="text-lg font-semibold tracking-tight text-white">StackMap</div>
          <div className="mt-0.5 text-xs text-slate-400">Local reference dashboard</div>
        </Link>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 py-3 lg:block lg:space-y-0.5 lg:overflow-visible">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-fit items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
