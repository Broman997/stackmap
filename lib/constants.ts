import type {
  IntegrationSource,
  IntegrationStatus,
  PaidStatus,
  ProjectStatus,
  ProjectType,
  RelationshipType,
  SubscriptionStatus,
  ToolCategory,
  ToolStatus,
} from "./types";

export const STORAGE_KEY = "stackmap.mvp.data.v1";
export const BACKUP_VERSION = 1;

export const PROJECT_TYPES: ProjectType[] = [
  "iOS app",
  "Android app",
  "website",
  "backend",
  "marketing",
  "other",
];

export const PROJECT_STATUSES: ProjectStatus[] = [
  "active",
  "inactive",
  "archived",
];

export const TOOL_CATEGORIES: ToolCategory[] = [
  "AI",
  "code",
  "database",
  "hosting",
  "app store",
  "analytics",
  "design",
  "marketing",
  "domain",
  "payment",
  "other",
];

export const PAID_STATUSES: PaidStatus[] = ["paid", "free", "trial", "unknown"];

export const TOOL_STATUSES: ToolStatus[] = [
  "active",
  "unused",
  "cancelled",
  "unknown",
];

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  "uses",
  "depends_on",
  "deploys_to",
  "stores_data_in",
  "pays_for",
  "integrates_with",
  "assists_with",
  "publishes_to",
  "markets_through",
  "other",
];

export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "active",
  "trial",
  "cancelled",
  "unknown",
];

export const DEFAULT_CURRENCY = "USD";

export const INTEGRATION_SOURCES: IntegrationSource[] = [
  "github",
  "supabase",
  "app_store",
  "google_play",
  "gmail",
  "payment",
  "airtable",
];

export const INTEGRATION_STATUSES: IntegrationStatus[] = [
  "planned",
  "ready_later",
  "disabled",
];
