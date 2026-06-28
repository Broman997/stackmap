export type NavItemId =
  | "dashboard"
  | "find"
  | "attention"
  | "projects"
  | "tools"
  | "subscriptions"
  | "relationships"
  | "map"
  | "settings";

export type NavItemDefinition = {
  id: NavItemId;
  href: string;
  label: string;
};

export const NAV_ORDER_STORAGE_KEY = "stackmap.nav.order.v1";
export const NAV_ORDER_EVENT = "stackmap-nav-order-updated";

export const DEFAULT_NAV_ITEMS: NavItemDefinition[] = [
  { id: "dashboard", href: "/", label: "Dashboard" },
  { id: "find", href: "/search", label: "Find" },
  { id: "attention", href: "/review", label: "Needs Attention" },
  { id: "projects", href: "/projects", label: "Projects" },
  { id: "tools", href: "/tools", label: "Tools" },
  { id: "subscriptions", href: "/subscriptions", label: "Subscriptions" },
  { id: "relationships", href: "/relationships", label: "Relationships" },
  { id: "map", href: "/map", label: "Visual Map" },
  { id: "settings", href: "/settings", label: "Settings" },
];

const defaultOrder = DEFAULT_NAV_ITEMS.map((item) => item.id);
const validIds = new Set<NavItemId>(defaultOrder);

export function normalizeNavOrder(value: unknown): NavItemId[] {
  const savedOrder = Array.isArray(value) ? value : [];
  const orderedIds = savedOrder.filter(
    (id): id is NavItemId => typeof id === "string" && validIds.has(id as NavItemId),
  );
  const uniqueIds = orderedIds.filter((id, index) => orderedIds.indexOf(id) === index);
  const missingIds = defaultOrder.filter((id) => !uniqueIds.includes(id));
  return [...uniqueIds, ...missingIds];
}

export function getOrderedNavItems(order: NavItemId[]) {
  const itemById = new Map(DEFAULT_NAV_ITEMS.map((item) => [item.id, item]));
  return normalizeNavOrder(order)
    .map((id) => itemById.get(id))
    .filter((item): item is NavItemDefinition => Boolean(item));
}

export function readNavOrder() {
  if (typeof window === "undefined") return defaultOrder;

  try {
    return normalizeNavOrder(JSON.parse(window.localStorage.getItem(NAV_ORDER_STORAGE_KEY) ?? "[]"));
  } catch {
    return defaultOrder;
  }
}

export function writeNavOrder(order: NavItemId[]) {
  window.localStorage.setItem(NAV_ORDER_STORAGE_KEY, JSON.stringify(normalizeNavOrder(order)));
  window.dispatchEvent(new Event(NAV_ORDER_EVENT));
}

export function resetNavOrder() {
  window.localStorage.removeItem(NAV_ORDER_STORAGE_KEY);
  window.dispatchEvent(new Event(NAV_ORDER_EVENT));
}
