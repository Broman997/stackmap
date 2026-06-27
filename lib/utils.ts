import type { Project, RelationshipType, StackMapData, Tool } from "./types";

export type DuplicateReviewGroup = {
  id: string;
  kind: "Project" | "Tool";
  reason: string;
  records: Array<{
    id: string;
    name: string;
    href: string;
    sourceUrl?: string;
  }>;
};

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function timestamp() {
  return new Date().toISOString();
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function daysSince(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

export function getEntityName(data: StackMapData, type: "project" | "tool", id: string) {
  const source = type === "project" ? data.projects : data.tools;
  return source.find((item) => item.id === id)?.name ?? "Unknown";
}

export function getRelationshipLabel(type: RelationshipType | string) {
  if (type === "assists_with") return "built with";
  return type.replaceAll("_", " ");
}

export function toNumber(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getProjectReviewItems(project: Project, data: StackMapData) {
  const linkedRelationships = data.relationships.filter(
    (relationship) =>
      (relationship.fromType === "project" && relationship.fromId === project.id) ||
      (relationship.toType === "project" && relationship.toId === project.id),
  );
  const items: string[] = [];
  const reviewedDaysAgo = daysSince(project.lastReviewedAt);
  if (!project.lastReviewedAt) items.push("Never reviewed");
  else if (reviewedDaysAgo !== null && reviewedDaysAgo > 90) items.push("Review is older than 90 days");
  if (!project.notes.trim()) items.push("Missing notes");
  if (project.status !== "active") items.push("Not active");
  if (linkedRelationships.length === 0) items.push("No relationships");
  return items;
}

export function getToolReviewItems(tool: Tool, data: StackMapData) {
  const linkedRelationships = data.relationships.filter(
    (relationship) =>
      (relationship.fromType === "tool" && relationship.fromId === tool.id) ||
      (relationship.toType === "tool" && relationship.toId === tool.id),
  );
  const linkedSubscriptions = data.subscriptions.filter(
    (subscription) => subscription.toolId === tool.id,
  );
  const items: string[] = [];
  const reviewedDaysAgo = daysSince(tool.lastReviewedAt);
  if (!tool.lastReviewedAt) items.push("Never reviewed");
  else if (reviewedDaysAgo !== null && reviewedDaysAgo > 90) items.push("Review is older than 90 days");
  if (tool.paidStatus === "unknown") items.push("Unknown paid status");
  if (tool.paidStatus === "paid" && !tool.renewalDate && linkedSubscriptions.length === 0) {
    items.push("Missing renewal details");
  }
  if (!tool.loginUrl.trim()) items.push("Missing login URL");
  if (tool.status === "unused" || tool.status === "unknown") items.push("Review tool status");
  if (linkedRelationships.length === 0) items.push("No relationships");
  return items;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function compactName(value: string) {
  let compact = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const suffixes = ["application", "website", "repository", "backend", "site", "repo", "app", "api"];

  let changed = true;
  while (changed) {
    changed = false;
    suffixes.forEach((suffix) => {
      if (compact.endsWith(suffix) && compact.length > suffix.length + 4) {
        compact = compact.slice(0, -suffix.length);
        changed = true;
      }
    });
  }

  return compact;
}

function nameTokens(value: string) {
  const ignored = new Set(["app", "site", "website", "repo", "repository", "api", "backend"]);
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !ignored.has(token));
}

function duplicateReason(
  first: { name: string; sourceName?: string; sourceUrl?: string },
  second: { name: string; sourceName?: string; sourceUrl?: string },
) {
  if (first.sourceUrl && second.sourceUrl && first.sourceUrl === second.sourceUrl) {
    return "Same source URL";
  }

  if (normalizeName(first.name) === normalizeName(second.name)) {
    return "Same name";
  }

  if (
    first.sourceName &&
    second.sourceName &&
    normalizeName(first.sourceName) === normalizeName(second.sourceName)
  ) {
    return "Same source name";
  }

  const firstCompact = compactName(first.name);
  const secondCompact = compactName(second.name);
  if (firstCompact.length >= 5 && firstCompact === secondCompact) {
    return "Equivalent compact name";
  }

  const shorter = firstCompact.length < secondCompact.length ? firstCompact : secondCompact;
  const longer = firstCompact.length < secondCompact.length ? secondCompact : firstCompact;
  if (shorter.length >= 8 && longer.startsWith(shorter)) {
    return "Similar compact name";
  }

  const firstTokens = new Set(nameTokens(first.name));
  const secondTokens = new Set(nameTokens(second.name));
  const overlap = [...firstTokens].filter((token) => secondTokens.has(token)).length;
  const smallestTokenSet = Math.min(firstTokens.size, secondTokens.size);
  if (smallestTokenSet >= 2 && overlap / smallestTokenSet >= 0.67) {
    return "Similar name tokens";
  }

  return "";
}

function duplicatePairs<T extends { id: string; name: string; sourceName?: string; sourceUrl?: string }>(
  records: T[],
  kind: "Project" | "Tool",
  hrefFor: (record: T) => string,
) {
  const groups: DuplicateReviewGroup[] = [];

  records.forEach((first, firstIndex) => {
    records.slice(firstIndex + 1).forEach((second) => {
      const reason = duplicateReason(first, second);
      if (!reason) return;

      groups.push({
        id: `${kind.toLowerCase()}-${first.id}-${second.id}`,
        kind,
        reason,
        records: [
          {
            id: first.id,
            name: first.name,
            href: hrefFor(first),
            sourceUrl: first.sourceUrl,
          },
          {
            id: second.id,
            name: second.name,
            href: hrefFor(second),
            sourceUrl: second.sourceUrl,
          },
        ],
      });
    });
  });

  return groups;
}

export function getDuplicateReviewGroups(data: StackMapData) {
  return [
    ...duplicatePairs(data.projects, "Project", (project) => `/projects/${project.id}`),
    ...duplicatePairs(data.tools, "Tool", (tool) => `/tools/${tool.id}`),
  ];
}
