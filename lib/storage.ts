"use client";

import { useEffect, useMemo, useState } from "react";
import { STORAGE_KEY } from "./constants";
import { seedData } from "./seed";
import type {
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

function isStackMapData(value: unknown): value is Omit<
  StackMapData,
  "suggestions" | "integrationPlans"
> &
  Partial<Pick<StackMapData, "suggestions" | "integrationPlans">> {
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
  value: Omit<StackMapData, "suggestions" | "integrationPlans"> &
    Partial<Pick<StackMapData, "suggestions" | "integrationPlans">>,
): StackMapData {
  return {
    projects: value.projects,
    tools: value.tools,
    relationships: value.relationships,
    subscriptions: value.subscriptions,
    suggestions: Array.isArray(value.suggestions) ? value.suggestions : [],
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
      deleteProject(id: string) {
        setData((current) => ({
          ...current,
          projects: current.projects.filter((item) => item.id !== id),
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
      deleteTool(id: string) {
        setData((current) => ({
          ...current,
          tools: current.tools.filter((item) => item.id !== id),
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
