"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  STORAGE_BACKUP_META_KEY,
  STORAGE_KEY,
  STORAGE_META_KEY,
  STORAGE_RECOVERY_KEY,
} from "./constants";
import { seedData } from "./seed";
import type {
  DuplicateDecision,
  DuplicateDecisionStatus,
  Project,
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

const STACKMAP_STORAGE_EVENT = "stackmap-storage-updated";

function emptyData(): StackMapData {
  return {
    projects: [],
    tools: [],
    relationships: [],
    subscriptions: [],
    suggestions: [],
    duplicateDecisions: [],
  };
}

export type LocalDataCounts = {
  projects: number;
  tools: number;
  relationships: number;
  subscriptions: number;
};

export type LocalStorageMeta = {
  savedAt: string;
  origin: string;
  counts: LocalDataCounts;
};

export type BackupMeta = {
  exportedAt: string;
  filename: string;
  origin: string;
  counts: LocalDataCounts;
};

function dataCounts(data: StackMapData): LocalDataCounts {
  return {
    projects: data.projects.length,
    tools: data.tools.length,
    relationships: data.relationships.length,
    subscriptions: data.subscriptions.length,
  };
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  const value = window.localStorage.getItem(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function readStorageMeta() {
  return readJson<LocalStorageMeta>(STORAGE_META_KEY);
}

export function readBackupMeta() {
  return readJson<BackupMeta>(STORAGE_BACKUP_META_KEY);
}

export function writeBackupMeta(meta: BackupMeta) {
  window.localStorage.setItem(STORAGE_BACKUP_META_KEY, JSON.stringify(meta));
  window.dispatchEvent(new Event(STACKMAP_STORAGE_EVENT));
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
  "suggestions" | "duplicateDecisions"
> &
  Partial<Pick<StackMapData, "suggestions" | "duplicateDecisions">> {
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
  value: Omit<StackMapData, "suggestions" | "duplicateDecisions"> &
    Partial<Pick<StackMapData, "suggestions" | "duplicateDecisions">>,
): StackMapData {
  const normalizedData: StackMapData = {
    projects: value.projects,
    tools: value.tools,
    relationships: value.relationships,
    subscriptions: value.subscriptions,
    suggestions: Array.isArray(value.suggestions) ? value.suggestions : [],
    duplicateDecisions: Array.isArray(value.duplicateDecisions)
      ? value.duplicateDecisions
      : [],
  };

  return {
    ...normalizedData,
    tools: normalizedData.tools.map((tool) =>
      tool.name === "Apple Developer" && tool.renewalDate === "2026-09-01"
        ? { ...tool, renewalDate: "2026-08-31" }
        : tool,
    ),
    subscriptions: normalizedData.subscriptions.map((subscription) =>
      subscription.vendorName === "Apple Developer" &&
      subscription.nextRenewalDate === "2026-09-01"
        ? { ...subscription, nextRenewalDate: "2026-08-31" }
        : subscription,
    ),
  };
}

function loadData(): StackMapData {
  if (typeof window === "undefined") return emptyData();

  const stored = window.localStorage.getItem(STORAGE_KEY);
  const recovery = window.localStorage.getItem(STORAGE_RECOVERY_KEY);

  if (!stored && !recovery) {
    const initialData =
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? cloneSeed() : emptyData();
    saveData(initialData);
    return initialData;
  }

  const parseSource = (source: string | null) => {
    if (!source) return null;
    const parsed = JSON.parse(source);
    return isStackMapData(parsed) ? normalizeData(parsed) : null;
  };

  try {
    return parseSource(stored) ?? parseSource(recovery) ?? emptyData();
  } catch {
    try {
      return parseSource(recovery) ?? emptyData();
    } catch {
      return emptyData();
    }
  }
}

function saveData(data: StackMapData) {
  const serialized = JSON.stringify(data);
  const savedAt = timestamp();
  window.localStorage.setItem(STORAGE_KEY, serialized);
  window.localStorage.setItem(STORAGE_RECOVERY_KEY, serialized);
  window.localStorage.setItem(
    STORAGE_META_KEY,
    JSON.stringify({
      savedAt,
      origin: window.location.origin,
      counts: dataCounts(data),
    }),
  );
  window.dispatchEvent(new Event(STACKMAP_STORAGE_EVENT));
}

export function useStackMapStorageMeta() {
  const [storageMeta, setStorageMeta] = useState<LocalStorageMeta | null>(() => readStorageMeta());
  const [backupMeta, setBackupMeta] = useState<BackupMeta | null>(() => readBackupMeta());

  function refreshStorageMeta() {
    setStorageMeta(readStorageMeta());
    setBackupMeta(readBackupMeta());
  }

  useEffect(() => {
    function handleStorageEvent(event: StorageEvent) {
      if (
        event.key &&
        event.key !== STORAGE_META_KEY &&
        event.key !== STORAGE_BACKUP_META_KEY &&
        event.key !== STORAGE_KEY
      ) {
        return;
      }

      refreshStorageMeta();
    }

    window.addEventListener(STACKMAP_STORAGE_EVENT, refreshStorageMeta);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener(STACKMAP_STORAGE_EVENT, refreshStorageMeta);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, []);

  return { storageMeta, backupMeta, refreshStorageMeta };
}

export function useStackMapData() {
  const [data, setData] = useState<StackMapData>(() => emptyData());
  const [isReady, setIsReady] = useState(false);
  const lastSerializedData = useRef("");

  useEffect(() => {
    let isCancelled = false;
    window.setTimeout(() => {
      if (isCancelled) return;
      const loadedData = loadData();
      lastSerializedData.current = JSON.stringify(loadedData);
      setData(loadedData);
      setIsReady(true);
    }, 0);

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const serialized = JSON.stringify(data);
    if (lastSerializedData.current === serialized) return;
    lastSerializedData.current = serialized;
    saveData(data);
  }, [data, isReady]);

  useEffect(() => {
    function refreshFromStorage() {
      const loadedData = loadData();
      const serialized = JSON.stringify(loadedData);
      if (lastSerializedData.current === serialized) return;

      lastSerializedData.current = serialized;
      setData(loadedData);
    }

    function handleStorageEvent(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;

      try {
        const parsed = JSON.parse(event.newValue);
        if (!isStackMapData(parsed)) return;

        const nextData = normalizeData(parsed);
        const serialized = JSON.stringify(nextData);
        if (lastSerializedData.current === serialized) return;

        lastSerializedData.current = serialized;
        setData(nextData);
      } catch {
        return;
      }
    }

    window.addEventListener(STACKMAP_STORAGE_EVENT, refreshFromStorage);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener(STACKMAP_STORAGE_EVENT, refreshFromStorage);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, []);

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
      resetSampleData() {
        setData(cloneSeed());
      },
      clearAllData() {
        setData(emptyData());
      },
      clearProjectsAndRelationships() {
        setData((current) => ({
          ...current,
          projects: [],
          relationships: [],
          subscriptions: [],
          suggestions: [],
        }));
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
