"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Boxes,
  CreditCard,
  FolderKanban,
  Home,
  Map,
  ClipboardCheck,
  GripVertical,
  Search,
  Settings,
  Wrench,
} from "lucide-react";
import {
  NAV_ORDER_EVENT,
  getOrderedNavItems,
  readNavOrder,
  writeNavOrder,
  type NavItemId,
} from "@/lib/navigation";
import { useStackMapData } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { getProjectReviewItems, getToolReviewItems } from "@/lib/utils";

const navIcons: Record<NavItemId, typeof Home> = {
  dashboard: Home,
  find: Search,
  attention: ClipboardCheck,
  projects: FolderKanban,
  tools: Wrench,
  subscriptions: CreditCard,
  relationships: Boxes,
  map: Map,
  settings: Settings,
};

export function Sidebar() {
  const pathname = usePathname();
  const { data } = useStackMapData();
  const [navOrder, setNavOrder] = useState<NavItemId[]>(() => readNavOrder());
  const [draggedNavId, setDraggedNavId] = useState<NavItemId | null>(null);
  const [dragOverNavId, setDragOverNavId] = useState<NavItemId | null>(null);

  useEffect(() => {
    function refreshNavOrder() {
      setNavOrder(readNavOrder());
    }

    window.addEventListener(NAV_ORDER_EVENT, refreshNavOrder);
    window.addEventListener("storage", refreshNavOrder);

    return () => {
      window.removeEventListener(NAV_ORDER_EVENT, refreshNavOrder);
      window.removeEventListener("storage", refreshNavOrder);
    };
  }, []);

  const attentionCount =
    data.projects.reduce((sum, project) => sum + getProjectReviewItems(project, data).length, 0) +
    data.tools.reduce((sum, tool) => sum + getToolReviewItems(tool, data).length, 0);
  const navItems = getOrderedNavItems(navOrder);

  function isNavItemId(value: string): value is NavItemId {
    return navOrder.includes(value as NavItemId);
  }

  function moveNavItem(sourceId: NavItemId, targetId: NavItemId) {
    if (sourceId === targetId) return;

    setNavOrder((current) => {
      const sourceIndex = current.indexOf(sourceId);
      const targetIndex = current.indexOf(targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;

      const nextOrder = [...current];
      nextOrder.splice(sourceIndex, 1);
      nextOrder.splice(targetIndex, 0, sourceId);
      writeNavOrder(nextOrder);
      return nextOrder;
    });
  }

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
          const Icon = navIcons[item.id];
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              draggable
              onDragStart={(event) => {
                setDraggedNavId(item.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", item.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverNavId(item.id);
              }}
              onDragLeave={() => setDragOverNavId(null)}
              onDrop={(event) => {
                event.preventDefault();
                const sourceId = event.dataTransfer.getData("text/plain");
                const navId = isNavItemId(sourceId) ? sourceId : draggedNavId;
                if (navId) moveNavItem(navId, item.id);
                setDraggedNavId(null);
                setDragOverNavId(null);
              }}
              onDragEnd={() => {
                setDraggedNavId(null);
                setDragOverNavId(null);
              }}
              className={cn(
                "flex min-w-fit cursor-grab items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors active:cursor-grabbing",
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
                dragOverNavId === item.id && draggedNavId !== item.id
                  ? "ring-2 ring-amber-300"
                  : false,
                draggedNavId === item.id ? "opacity-60" : false,
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">{item.label}</span>
              {item.id === "attention" && attentionCount > 0 ? (
                <span
                  aria-label={`${attentionCount} items need attention`}
                  className={cn(
                    "ml-auto rounded-full px-2 py-0.5 text-xs font-semibold",
                    isActive ? "bg-white text-indigo-700" : "bg-amber-400 text-slate-950",
                  )}
                >
                  {attentionCount}
                </span>
              ) : null}
              <GripVertical className="h-4 w-4 shrink-0 text-current opacity-45" aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
