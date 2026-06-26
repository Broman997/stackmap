import type { Project, StackMapData, Tool } from "./types";

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
