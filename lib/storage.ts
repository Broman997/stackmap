"use client";

import { useEffect, useMemo, useState } from "react";
import { STORAGE_KEY } from "./constants";
import { seedData } from "./seed";
import type {
  DuplicateDecision,
  DuplicateDecisionStatus,
  Project,
  IntegrationPlan,
  Relationship,
  StackMapData,
  Suggestion,
  Subscription,
  Tool,
} from "./types";
import { createId, timestamp } from "./utils";

function cloneSeed(): StackMapData {
  return JSON.parse(JSON.stringify(seedData)) as StackMapData;
}

function combineNotes(keepNotes: string, removeNotes: string) {
  return [keepNotes, removeNotes]
    .map((note) => note.trim())
    .filter(Boolean)
    .filter((note, index, notes) => notes.indexOf(note) === index)
    .join("\n");
}

function relationshipKey(relationship: Relationship) {
  return [
    relationship.fromType,
    relationship.fromId,
    relationship.toType,
    relationship.toId,
    relationship.relationshipType,
  ].join(":");
}

function replaceRelationshipEntity(
  relationship: Relationship,
  type: "project" | "tool",
  removeId: string,
  keepId: string,
  updatedAt: string,
) {
  return {
    ...relationship,
    fromId:
      relationship.fromType === type && relationship.fromId === removeId
        ? keepId
        : relationship.fromId,
    toId:
      relationship.toType === type && relationship.toId === removeId ? keepId : relationship.toId,
    updatedAt,
  };
}

function removeDuplicateRelationships(relationships: Relationship[]) {
  const seen = new Set<string>();
  return relationships.filter((relationship) => {
    if (
      relationship.fromType === relationship.toType &&
      relationship.fromId === relationship.toId
    ) {
      return false;
    }

    const key = relationshipKey(relationship);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function filterDecisionsForRemovedRecord(
  decisions: DuplicateDecision[],
  removeId: string,
  duplicateGroupId?: string,
) {
  return decisions.filter(
    (decision) =>
      decision.duplicateGroupId !== duplicateGroupId &&
      decision.keepRecordId !== removeId &&
      !decision.duplicateGroupId.includes(removeId),
  );
}

function isStackMapData(value: unknown): value is Omit<
  StackMapData,
  "suggestions" | "integrationPlans" | "duplicateDecisions"
> &
  Partial<Pick<StackMapData, "suggestions" | "integrationPlans" | "duplicateDecisions">> {
  const candidate = value as StackMapData;
  return Boolean(
    candidate &&
      Array.isArray(candidate.projects) &&
      Array.isArray(candidate.tools) &&
      Array.isArray(candidate.relationships) &&
      Array.isArray(candidate.subscriptions),
  );
}

function normalizeData(
  value: Omit<StackMapData, "suggestions" | "integrationPlans" | "duplicateDecisions"> &
    Partial<Pick<StackMapData, "suggestions" | "integrationPlans" | "duplicateDecisions">>,
): StackMapData {
  return {
    projects: value.projects,
    tools: value.tools,
    relationships: value.relationships,
    subscriptions: value.subscriptions,
    suggestions: Array.isArray(value.suggestions) ? value.suggestions : [],
    duplicateDecisions: Array.isArray(value.duplicateDecisions)
      ? value.duplicateDecisions
      : [],
    integrationPlans: Array.isArray(value.integrationPlans)
      ? value.integrationPlans
      : cloneSeed().integrationPlans,
  };
}

function loadData(): StackMapData {
  if (typeof window === "undefined") return cloneSeed();
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const seeded = cloneSeed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(stored);
    return isStackMapData(parsed) ? normalizeData(parsed) : cloneSeed();
  } catch {
    return cloneSeed();
  }
}

export function useStackMapData() {
  const [data, setData] = useState<StackMapData>(() => cloneSeed());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setData(loadData());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, isReady]);

  const actions = useMemo(
    () => ({
      addProject(project: Omit<Project, "id" | "createdAt" | "updatedAt">) {
        const now = timestamp();
        setData((current) => ({
          ...current,
          projects: [
            ...current.projects,
            { ...project, id: createId("project"), createdAt: now, updatedAt: now },
          ],
        }));
      },
      updateProject(id: string, project: Omit<Project, "id" | "createdAt" | "updatedAt">) {
        const now = timestamp();
        setData((current) => ({
          ...current,
          projects: current.projects.map((item) =>
            item.id === id ? { ...item, ...project, updatedAt: now } : item,
          ),
        }));
      },
      mergeProjectSuggestion(id: string, updates: Partial<Omit<Project, "id" | "createdAt">>) {
        const now = timestamp();
        setData((current) => ({
          ...current,
          projects: current.projects.map((item) =>
            item.id === id ? { ...item, ...updates, updatedAt: now } : item,
          ),
        }));
      },
      deleteProject(id: string) {
        setData((current) => ({
          ...current,
          projects: current.projects.filter((item) => item.id !== id),
          duplicateDecisions: filterDecisionsForRemovedRecord(current.duplicateDecisions, id),
          relationships: current.relationships.filter(
            (item) =>
              !(item.fromType === "project" && item.fromId === id) &&
              !(item.toType === "project" && item.toId === id),
          ),
        }));
      },
      markProjectReviewed(id: string) {
        const now = timestamp();
        setData((current) => ({
          ...current,
          projects: current.projects.map((item) =>
            item.id === id ? { ...item, lastReviewedAt: now, updatedAt: now } : item,
          ),
        }));
      },
      addTool(tool: Omit<Tool, "id" | "createdAt" | "updatedAt">) {
        const now = timestamp();
        setData((current) => ({
          ...current,
          tools: [
            ...current.tools,
            { ...tool, id: createId("tool"), createdAt: now, updatedAt: now },
          ],
        }));
      },
      updateTool(id: string, tool: Omit<Tool, "id" | "createdAt" | "updatedAt">) {
        const now = timestamp();
        setData((current) => ({
          ...current,
          tools: current.tools.map((item) =>
            item.id === id ? { ...item, ...tool, updatedAt: now } : item,
          ),
        }));
      },
      mergeToolSuggestion(id: string, updates: Partial<Omit<Tool, "id" | "createdAt">>) {
        const now = timestamp();
        setData((current) => ({
          ...current,
          tools: current.tools.map((item) =>
            item.id === id ? { ...item, ...updates, updatedAt: now } : item,
          ),
        }));
      },
      deleteTool(id: string) {
        setData((current) => ({
          ...current,
          tools: current.tools.filter((item) => item.id !== id),
          duplicateDecisions: filterDecisionsForRemovedRecord(current.duplicateDecisions, id),
          subscriptions: current.subscriptions.filter((item) => item.toolId !== id),
          relationships: current.relationships.filter(
            (item) =>
              !(item.fromType === "tool" && item.fromId === id) &&
              !(item.toType === "tool" && item.toId === id),
          ),
        }));
      },
      markToolReviewed(id: string) {
        const now = timestamp();
        setData((current) => ({
          ...current,
          tools: current.tools.map((item) =>
            item.id === id ? { ...item, lastReviewedAt: now, updatedAt: now } : item,
          ),
        }));
      },
      addSubscription(subscription: Omit<Subscription, "id" | "createdAt" | "updatedAt">) {
        const now = timestamp();
        setData((current) => ({
          ...current,
          subscriptions: [
            ...current.subscriptions,
            {
              ...subscription,
              id: createId("subscription"),
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
      },
      updateSubscription(
        id: string,
        subscription: Omit<Subscription, "id" | "createdAt" | "updatedAt">,
      ) {
        const now = timestamp();
        setData((current) => ({
          ...current,
          subscriptions: current.subscriptions.map((item) =>
            item.id === id ? { ...item, ...subscription, updatedAt: now } : item,
          ),
        }));
      },
      deleteSubscription(id: string) {
        setData((current) => ({
          ...current,
          subscriptions: current.subscriptions.filter((item) => item.id !== id),
        }));
      },
      addRelationship(relationship: Omit<Relationship, "id" | "createdAt" | "updatedAt">) {
        const now = timestamp();
        setData((current) => ({
          ...current,
          relationships: [
            ...current.relationships,
            {
              ...relationship,
              id: createId("relationship"),
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
      },
      updateRelationship(
        id: string,
        relationship: Omit<Relationship, "id" | "createdAt" | "updatedAt">,
      ) {
        const now = timestamp();
        setData((current) => ({
          ...current,
          relationships: current.relationships.map((item) =>
            item.id === id ? { ...item, ...relationship, updatedAt: now } : item,
          ),
        }));
      },
      deleteRelationship(id: string) {
        setData((current) => ({
          ...current,
          relationships: current.relationships.filter((item) => item.id !== id),
        }));
      },
      addSuggestion(
        suggestion: Omit<Suggestion, "id" | "status" | "createdAt" | "updatedAt"> &
          Partial<Pick<Suggestion, "status">>,
      ) {
        const now = timestamp();
        setData((current) => ({
          ...current,
          suggestions: [
            ...current.suggestions,
            {
              ...suggestion,
              id: createId("suggestion"),
              status: suggestion.status ?? "pending",
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
      },
      updateSuggestionStatus(id: string, status: Suggestion["status"]) {
        const now = timestamp();
        setData((current) => ({
          ...current,
          suggestions: current.suggestions.map((item) =>
            item.id === id ? { ...item, status, updatedAt: now } : item,
          ),
        }));
      },
      deleteSuggestion(id: string) {
        setData((current) => ({
          ...current,
          suggestions: current.suggestions.filter((item) => item.id !== id),
        }));
      },
      clearSuggestions() {
        setData((current) => ({
          ...current,
          suggestions: [],
        }));
      },
      setDuplicateDecision(
        duplicateGroupId: string,
        status: DuplicateDecisionStatus,
        keepRecordId?: string,
      ) {
        const now = timestamp();
        setData((current) => {
          const existing = current.duplicateDecisions.find(
            (decision) => decision.duplicateGroupId === duplicateGroupId,
          );
          const nextDecision: DuplicateDecision = existing
            ? { ...existing, status, keepRecordId, updatedAt: now }
            : {
                id: createId("duplicate-decision"),
                duplicateGroupId,
                status,
                keepRecordId,
                notes: "",
                createdAt: now,
                updatedAt: now,
              };

          return {
            ...current,
            duplicateDecisions: existing
              ? current.duplicateDecisions.map((decision) =>
                  decision.id === existing.id ? nextDecision : decision,
                )
              : [...current.duplicateDecisions, nextDecision],
          };
        });
      },
      clearDuplicateDecision(duplicateGroupId: string) {
        setData((current) => ({
          ...current,
          duplicateDecisions: current.duplicateDecisions.filter(
            (decision) => decision.duplicateGroupId !== duplicateGroupId,
          ),
        }));
      },
      mergeDuplicateRecords(
        kind: "Project" | "Tool",
        keepId: string,
        removeId: string,
        duplicateGroupId?: string,
      ) {
        if (keepId === removeId) return;
        const now = timestamp();
        setData((current) => {
          if (kind === "Project") {
            const keep = current.projects.find((project) => project.id === keepId);
            const remove = current.projects.find((project) => project.id === removeId);
            if (!keep || !remove) return current;

            const projects = current.projects
              .map((project) =>
                project.id === keepId
                  ? {
                      ...project,
                      type:
                        project.type === "other" && remove.type !== "other"
                          ? remove.type
                          : project.type,
                      notes: combineNotes(project.notes, remove.notes),
                      lastReviewedAt: project.lastReviewedAt || remove.lastReviewedAt,
                      source: project.source ?? remove.source,
                      sourceName: project.sourceName || remove.sourceName,
                      sourceUrl: project.sourceUrl || remove.sourceUrl,
                      sourceVisibility: project.sourceVisibility || remove.sourceVisibility,
                      primaryLanguage: project.primaryLanguage || remove.primaryLanguage,
                      lastDetectedAt: project.lastDetectedAt || remove.lastDetectedAt,
                      updatedAt: now,
                    }
                  : project,
              )
              .filter((project) => project.id !== removeId);

            const relationships = removeDuplicateRelationships(
              current.relationships.map((relationship) =>
                replaceRelationshipEntity(relationship, "project", removeId, keepId, now),
              ),
            );

            return {
              ...current,
              projects,
              relationships,
              duplicateDecisions: filterDecisionsForRemovedRecord(
                current.duplicateDecisions,
                removeId,
                duplicateGroupId,
              ),
            };
          }

          const keep = current.tools.find((tool) => tool.id === keepId);
          const remove = current.tools.find((tool) => tool.id === removeId);
          if (!keep || !remove) return current;

          const tools = current.tools
            .map((tool) =>
              tool.id === keepId
                ? {
                    ...tool,
                    category:
                      tool.category === "other" && remove.category !== "other"
                        ? remove.category
                        : tool.category,
                    websiteUrl: tool.websiteUrl || remove.websiteUrl,
                    loginUrl: tool.loginUrl || remove.loginUrl,
                    accountEmail: tool.accountEmail || remove.accountEmail,
                    paidStatus:
                      tool.paidStatus === "unknown" && remove.paidStatus !== "unknown"
                        ? remove.paidStatus
                        : tool.paidStatus,
                    monthlyCost: tool.monthlyCost || remove.monthlyCost,
                    annualCost: tool.annualCost || remove.annualCost,
                    billingCycle: tool.billingCycle || remove.billingCycle,
                    renewalDate: tool.renewalDate || remove.renewalDate,
                    notes: combineNotes(tool.notes, remove.notes),
                    lastReviewedAt: tool.lastReviewedAt || remove.lastReviewedAt,
                    source: tool.source ?? remove.source,
                    sourceName: tool.sourceName || remove.sourceName,
                    sourceUrl: tool.sourceUrl || remove.sourceUrl,
                    sourceVisibility: tool.sourceVisibility || remove.sourceVisibility,
                    primaryLanguage: tool.primaryLanguage || remove.primaryLanguage,
                    lastDetectedAt: tool.lastDetectedAt || remove.lastDetectedAt,
                    updatedAt: now,
                  }
                : tool,
            )
            .filter((tool) => tool.id !== removeId);

          const relationships = removeDuplicateRelationships(
            current.relationships.map((relationship) =>
              replaceRelationshipEntity(relationship, "tool", removeId, keepId, now),
            ),
          );
          const subscriptions = current.subscriptions.map((subscription) =>
            subscription.toolId === removeId
              ? { ...subscription, toolId: keepId, updatedAt: now }
              : subscription,
          );

          return {
            ...current,
            tools,
            relationships,
            subscriptions,
            duplicateDecisions: filterDecisionsForRemovedRecord(
              current.duplicateDecisions,
              removeId,
              duplicateGroupId,
            ),
          };
        });
      },
      updateIntegrationPlan(
        id: string,
        plan: Pick<IntegrationPlan, "status" | "notes">,
      ) {
        const now = timestamp();
        setData((current) => ({
          ...current,
          integrationPlans: current.integrationPlans.map((item) =>
            item.id === id ? { ...item, ...plan, updatedAt: now } : item,
          ),
        }));
      },
      resetIntegrationPlans() {
        setData((current) => ({
          ...current,
          integrationPlans: cloneSeed().integrationPlans,
        }));
      },
      resetSampleData() {
        setData(cloneSeed());
      },
      importData(nextData: StackMapData) {
        if (!isStackMapData(nextData)) {
          throw new Error("Invalid StackMap data");
        }
        setData(normalizeData(nextData));
      },
    }),
    [],
  );

  return { data, isReady, ...actions };
}
