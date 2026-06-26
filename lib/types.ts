export type ProjectType =
  | "iOS app"
  | "Android app"
  | "website"
  | "backend"
  | "marketing"
  | "other";

export type ProjectStatus = "active" | "inactive" | "archived";

export type ToolCategory =
  | "AI"
  | "code"
  | "database"
  | "hosting"
  | "app store"
  | "analytics"
  | "design"
  | "marketing"
  | "domain"
  | "payment"
  | "other";

export type PaidStatus = "paid" | "free" | "trial" | "unknown";
export type ToolStatus = "active" | "unused" | "cancelled" | "unknown";
export type EntityType = "project" | "tool";

export type RelationshipType =
  | "uses"
  | "depends_on"
  | "deploys_to"
  | "stores_data_in"
  | "pays_for"
  | "integrates_with"
  | "assists_with"
  | "publishes_to"
  | "markets_through"
  | "other";

export type SubscriptionStatus = "active" | "trial" | "cancelled" | "unknown";
export type SuggestionSource =
  | "manual_import"
  | "local_scan"
  | "github"
  | "supabase"
  | "app_store"
  | "google_play"
  | "gmail"
  | "payment"
  | "airtable";
export type SuggestionEntityType = "project" | "tool" | "relationship" | "subscription";
export type SuggestionStatus = "pending" | "accepted" | "dismissed";
export type SuggestionFieldValue = string | number | boolean | null;
export type IntegrationSource = Exclude<SuggestionSource, "manual_import" | "local_scan">;
export type IntegrationStatus = "planned" | "ready_later" | "disabled";
export type IntegrationAccessMode = "read_only";
export type RecordSource = "manual" | "mock" | SuggestionSource;
export type DuplicateDecisionStatus =
  | "merge_records"
  | "same_thing"
  | "separate_records"
  | "cleanup_needed";

export type SourceMetadata = {
  source?: RecordSource;
  sourceName?: string;
  sourceUrl?: string;
  sourceVisibility?: string;
  primaryLanguage?: string;
  lastDetectedAt?: string;
};

export type Project = SourceMetadata & {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  notes: string;
  lastReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Tool = SourceMetadata & {
  id: string;
  name: string;
  category: ToolCategory;
  websiteUrl: string;
  loginUrl: string;
  accountEmail: string;
  paidStatus: PaidStatus;
  monthlyCost: number;
  annualCost: number;
  billingCycle: string;
  renewalDate: string;
  status: ToolStatus;
  notes: string;
  lastReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Relationship = {
  id: string;
  fromType: EntityType;
  fromId: string;
  toType: EntityType;
  toId: string;
  relationshipType: RelationshipType;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Subscription = {
  id: string;
  toolId: string;
  vendorName: string;
  amount: number;
  currency: string;
  billingCycle: string;
  nextRenewalDate: string;
  paymentMethod: string;
  status: SubscriptionStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Suggestion = {
  id: string;
  source: SuggestionSource;
  entityType: SuggestionEntityType;
  status: SuggestionStatus;
  confidence: number;
  detectedFields: Record<string, SuggestionFieldValue>;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationPlan = {
  id: string;
  name: string;
  source: IntegrationSource;
  status: IntegrationStatus;
  accessMode: IntegrationAccessMode;
  approvalRequired: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type DuplicateDecision = {
  id: string;
  duplicateGroupId: string;
  status: DuplicateDecisionStatus;
  keepRecordId?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type StackMapData = {
  projects: Project[];
  tools: Tool[];
  relationships: Relationship[];
  subscriptions: Subscription[];
  suggestions: Suggestion[];
  integrationPlans: IntegrationPlan[];
  duplicateDecisions: DuplicateDecision[];
};
