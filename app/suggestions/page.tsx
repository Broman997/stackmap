"use client";

import { Check, ChevronDown, GitMerge, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useStackMapData } from "@/lib/storage";
import type {
  EntityType,
  ProjectType,
  RelationshipType,
  SourceMetadata,
  StackMapData,
  Suggestion,
  SuggestionEntityType,
  SuggestionStatus,
  ToolCategory,
} from "@/lib/types";

type SuggestionTypeFilter = "all" | SuggestionEntityType;

function textField(suggestion: Suggestion, key: string, fallback = "") {
  const value = suggestion.detectedFields[key];
  return typeof value === "string" ? value : fallback;
}

function numberField(suggestion: Suggestion, key: string, fallback = 0) {
  const value = suggestion.detectedFields[key];
  return typeof value === "number" ? value : fallback;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function sourceMetadata(suggestion: Suggestion): SourceMetadata {
  return {
    source: suggestion.source,
    sourceName: textField(suggestion, "sourceName", textField(suggestion, "name")),
    sourceUrl: textField(suggestion, "sourceUrl", textField(suggestion, "websiteUrl")),
    sourceVisibility: textField(suggestion, "sourceVisibility"),
    primaryLanguage: textField(suggestion, "primaryLanguage"),
    lastDetectedAt: textField(suggestion, "lastDetectedAt", suggestion.createdAt),
  };
}

function findEntityBySuggestion(
  data: StackMapData,
  type: EntityType,
  name: string,
  sourceUrl: string,
) {
  if (type === "project") {
    return data.projects.find(
      (project) =>
        (sourceUrl && project.sourceUrl === sourceUrl) ||
        normalize(project.name) === normalize(name),
    );
  }

  return data.tools.find(
    (tool) =>
      (sourceUrl && tool.sourceUrl === sourceUrl) ||
      normalize(tool.name) === normalize(name),
  );
}

function relationshipResolution(data: StackMapData, suggestion: Suggestion) {
  const fromType = textField(suggestion, "fromType", "project") as EntityType;
  const toType = textField(suggestion, "toType", "tool") as EntityType;
  const relationshipType = textField(
    suggestion,
    "relationshipType",
    "uses",
  ) as RelationshipType;
  const from = findEntityBySuggestion(
    data,
    fromType,
    textField(suggestion, "fromName"),
    textField(suggestion, "fromSourceUrl"),
  );
  const to = findEntityBySuggestion(
    data,
    toType,
    textField(suggestion, "toName"),
    textField(suggestion, "toSourceUrl"),
  );

  return { fromType, toType, relationshipType, from, to };
}

function suggestionTitle(suggestion: Suggestion) {
  if (suggestion.entityType === "relationship") {
    return `${textField(suggestion, "fromName", "Unknown")} ${textField(
      suggestion,
      "relationshipType",
      "uses",
    ).replaceAll("_", " ")} ${textField(suggestion, "toName", "Unknown")}`;
  }

  return textField(suggestion, "name", "Unnamed suggestion");
}

function acceptLabel(suggestion: Suggestion) {
  if (suggestion.entityType === "project") return "Accept Project";
  if (suggestion.entityType === "tool") return "Accept Tool";
  if (suggestion.entityType === "relationship") return "Accept Relationship";
  return "Accept";
}

export default function SuggestionsPage() {
  const {
    data,
    addProject,
    addTool,
    addRelationship,
    mergeProjectSuggestion,
    mergeToolSuggestion,
    updateSuggestionStatus,
    deleteSuggestion,
  } = useStackMapData();
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus>("pending");
  const [typeFilter, setTypeFilter] = useState<SuggestionTypeFilter>("all");
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const suggestions = data.suggestions.filter(
    (item) =>
      item.status === statusFilter &&
      (typeFilter === "all" || item.entityType === typeFilter),
  );
  const counts = {
    pending: data.suggestions.filter((item) => item.status === "pending").length,
    accepted: data.suggestions.filter((item) => item.status === "accepted").length,
    dismissed: data.suggestions.filter((item) => item.status === "dismissed").length,
  };
  const typeFilters: Array<{ value: SuggestionTypeFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "project", label: "Projects" },
    { value: "tool", label: "Tools" },
    { value: "relationship", label: "Relationships" },
    { value: "subscription", label: "Subscriptions" },
  ];
  const matchesBySuggestionId = useMemo(() => {
    const matches: Record<string, Array<{ id: string; name: string }>> = {};
    data.suggestions.forEach((suggestion) => {
      const name = normalize(textField(suggestion, "name"));
      if (!name) {
        matches[suggestion.id] = [];
        return;
      }

      if (suggestion.entityType === "project") {
        matches[suggestion.id] = data.projects
          .filter((project) => normalize(project.name) === name)
          .map((project) => ({ id: project.id, name: project.name }));
        return;
      }

      if (suggestion.entityType === "tool") {
        matches[suggestion.id] = data.tools
          .filter((tool) => normalize(tool.name) === name)
          .map((tool) => ({ id: tool.id, name: tool.name }));
        return;
      }

      matches[suggestion.id] = [];
    });
    return matches;
  }, [data.projects, data.suggestions, data.tools]);

  const readyRelationshipSuggestions = suggestions.filter((suggestion) => {
    if (suggestion.entityType !== "relationship" || suggestion.status !== "pending") return false;
    const { from, to } = relationshipResolution(data, suggestion);
    return Boolean(from && to);
  });

  function acceptReadyRelationships() {
    readyRelationshipSuggestions.forEach((suggestion) => acceptSuggestion(suggestion));
  }

  function acceptSuggestion(suggestion: Suggestion) {
    if (suggestion.entityType === "project") {
      addProject({
        name: textField(suggestion, "name", "Untitled Project"),
        type: textField(suggestion, "type", "other") as ProjectType,
        status: "active",
        notes: suggestion.notes || textField(suggestion, "notes"),
        lastReviewedAt: "",
        ...sourceMetadata(suggestion),
      });
      updateSuggestionStatus(suggestion.id, "accepted");
      return;
    }

    if (suggestion.entityType === "tool") {
      addTool({
        name: textField(suggestion, "name", "Untitled Tool"),
        category: textField(suggestion, "category", "other") as ToolCategory,
        websiteUrl: textField(suggestion, "websiteUrl"),
        loginUrl: textField(suggestion, "loginUrl"),
        accountEmail: textField(suggestion, "accountEmail"),
        paidStatus: "unknown",
        monthlyCost: numberField(suggestion, "monthlyCost"),
        annualCost: numberField(suggestion, "annualCost"),
        billingCycle: textField(suggestion, "billingCycle"),
        renewalDate: textField(suggestion, "renewalDate"),
        status: "unknown",
        notes: suggestion.notes || textField(suggestion, "notes"),
        lastReviewedAt: "",
        ...sourceMetadata(suggestion),
      });
      updateSuggestionStatus(suggestion.id, "accepted");
      return;
    }

    if (suggestion.entityType === "relationship") {
      const { fromType, toType, relationshipType, from, to } = relationshipResolution(
        data,
        suggestion,
      );
      if (!from || !to) return;

      const exists = data.relationships.some(
        (relationship) =>
          relationship.fromType === fromType &&
          relationship.fromId === from.id &&
          relationship.toType === toType &&
          relationship.toId === to.id &&
          relationship.relationshipType === relationshipType,
      );

      if (!exists) {
        addRelationship({
          fromType,
          fromId: from.id,
          toType,
          toId: to.id,
          relationshipType,
          notes: suggestion.notes || textField(suggestion, "notes"),
        });
      }
      updateSuggestionStatus(suggestion.id, "accepted");
    }
  }

  function mergeSuggestion(suggestion: Suggestion) {
    const targetId = mergeTargets[suggestion.id] ?? matchesBySuggestionId[suggestion.id]?.[0]?.id;
    if (!targetId) return;

    if (suggestion.entityType === "project") {
      const current = data.projects.find((project) => project.id === targetId);
      if (!current) return;
      const suggestedNotes = suggestion.notes || textField(suggestion, "notes");
      mergeProjectSuggestion(targetId, {
        type: textField(suggestion, "type", current.type) as ProjectType,
        status: current.status,
        notes: suggestedNotes
          ? [current.notes, suggestedNotes].filter(Boolean).join("\n")
          : current.notes,
        ...sourceMetadata(suggestion),
      });
      updateSuggestionStatus(suggestion.id, "accepted");
      return;
    }

    if (suggestion.entityType === "tool") {
      const current = data.tools.find((tool) => tool.id === targetId);
      if (!current) return;
      const suggestedNotes = suggestion.notes || textField(suggestion, "notes");
      mergeToolSuggestion(targetId, {
        category: textField(suggestion, "category", current.category) as ToolCategory,
        websiteUrl: current.websiteUrl || textField(suggestion, "websiteUrl"),
        loginUrl: current.loginUrl || textField(suggestion, "loginUrl"),
        accountEmail: current.accountEmail || textField(suggestion, "accountEmail"),
        billingCycle: current.billingCycle || textField(suggestion, "billingCycle"),
        renewalDate: current.renewalDate || textField(suggestion, "renewalDate"),
        monthlyCost: current.monthlyCost || numberField(suggestion, "monthlyCost"),
        annualCost: current.annualCost || numberField(suggestion, "annualCost"),
        notes: suggestedNotes
          ? [current.notes, suggestedNotes].filter(Boolean).join("\n")
          : current.notes,
        ...sourceMetadata(suggestion),
      });
      updateSuggestionStatus(suggestion.id, "accepted");
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Suggestions</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review staged detections before anything becomes a confirmed StackMap record.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Status</span>
          {(["pending", "accepted", "dismissed"] as SuggestionStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={
                statusFilter === status
                  ? "rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                  : "rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              }
            >
              {status} ({counts[status]})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Type</span>
          {typeFilters.map((filterOption) => (
            <button
              key={filterOption.value}
              type="button"
              onClick={() => setTypeFilter(filterOption.value)}
              className={
                typeFilter === filterOption.value
                  ? "rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                  : "rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              }
            >
              {filterOption.label}
            </button>
          ))}
        </div>
        {readyRelationshipSuggestions.length > 0 ? (
          <button
            type="button"
            onClick={acceptReadyRelationships}
            className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Accept {readyRelationshipSuggestions.length} Ready Relationship
            {readyRelationshipSuggestions.length === 1 ? "" : "s"}
          </button>
        ) : null}
      </section>

      <section className="space-y-3">
        {suggestions.map((suggestion) => {
          const matches = matchesBySuggestionId[suggestion.id] ?? [];
          const resolvedRelationship =
            suggestion.entityType === "relationship"
              ? relationshipResolution(data, suggestion)
              : null;
          const relationshipFrom = resolvedRelationship?.from ?? null;
          const relationshipTo = resolvedRelationship?.to ?? null;
          const isExpanded = Boolean(expandedFields[suggestion.id]);
          const canAcceptRelationship =
            suggestion.status === "pending" &&
            suggestion.entityType === "relationship" &&
            Boolean(relationshipFrom && relationshipTo);
          const canMerge =
            suggestion.status === "pending" &&
            ["project", "tool"].includes(suggestion.entityType) &&
            matches.length > 0;

          return (
          <article key={suggestion.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold uppercase text-slate-600">
                    {suggestion.entityType}
                  </span>
                  <span className="rounded-md bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-800">
                    {suggestion.source}
                  </span>
                  <p className="font-medium text-slate-950">
                    {suggestionTitle(suggestion)}
                  </p>
                </div>
                <p className="mt-2 text-sm text-slate-600">{suggestion.notes || "No notes."}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Confidence: {Math.round(suggestion.confidence * 100)}%
                </p>
                {matches.length > 0 ? (
                  <p className="mt-2 text-sm font-medium text-amber-700">
                    Possible match: {matches.map((match) => match.name).join(", ")}
                  </p>
                ) : null}
                {suggestion.entityType === "relationship" ? (
                  <p className="mt-2 text-sm font-medium text-slate-600">
                    {relationshipFrom && relationshipTo
                      ? `Ready: ${relationshipFrom.name} ${resolvedRelationship?.relationshipType.replaceAll("_", " ")} ${relationshipTo.name}`
                      : "Needs matching project and tool records before it can be accepted."}
                  </p>
                ) : null}
                {suggestion.entityType === "project" ? (
                  <p className="mt-2 text-sm text-slate-600">
                    Project type: {textField(suggestion, "type", "other")} / Status:{" "}
                    {textField(suggestion, "status", "active")}
                  </p>
                ) : null}
                {suggestion.entityType === "tool" ? (
                  <p className="mt-2 text-sm text-slate-600">
                    Tool category: {textField(suggestion, "category", "other")} / Status:{" "}
                    {textField(suggestion, "status", "unknown")}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => acceptSuggestion(suggestion)}
                  disabled={
                    suggestion.status !== "pending" ||
                    (!["project", "tool"].includes(suggestion.entityType) && !canAcceptRelationship)
                  }
                  className="inline-flex items-center gap-2 rounded-md border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                  aria-label={acceptLabel(suggestion)}
                  title={
                    suggestion.entityType === "relationship"
                      ? "Accept relationship"
                      : "Accept as new"
                  }
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {acceptLabel(suggestion)}
                </button>
                <button
                  type="button"
                  onClick={() => mergeSuggestion(suggestion)}
                  disabled={!canMerge}
                  className="inline-flex items-center gap-2 rounded-md border border-cyan-200 px-3 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                  aria-label="Merge into existing"
                  title="Merge into existing"
                >
                  <GitMerge className="h-4 w-4" aria-hidden="true" />
                  Merge
                </button>
                <button
                  type="button"
                  onClick={() => updateSuggestionStatus(suggestion.id, "dismissed")}
                  disabled={suggestion.status !== "pending"}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                  aria-label="Dismiss suggestion"
                  title="Dismiss suggestion"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => deleteSuggestion(suggestion.id)}
                  className="inline-flex items-center gap-2 rounded-md border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                  aria-label="Delete suggestion"
                  title="Delete suggestion"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setExpandedFields((current) => ({
                  ...current,
                  [suggestion.id]: !current[suggestion.id],
                }))
              }
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
            >
              <ChevronDown
                className={isExpanded ? "h-4 w-4 rotate-180" : "h-4 w-4"}
                aria-hidden="true"
              />
              {isExpanded ? "Hide detected fields" : "Show detected fields"}
            </button>
            {isExpanded ? (
              <div className="mt-3 grid gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600 sm:grid-cols-2">
                {Object.entries(suggestion.detectedFields).map(([key, value]) => (
                  <p key={key}>
                    <span className="font-medium text-slate-800">{key}:</span>{" "}
                    {String(value ?? "")}
                  </p>
                ))}
              </div>
            ) : null}
            {matches.length > 0 && suggestion.status === "pending" ? (
              <label className="mt-3 grid gap-1 text-sm font-medium text-slate-700">
                Merge target
                <select
                  value={mergeTargets[suggestion.id] ?? matches[0]?.id ?? ""}
                  onChange={(event) =>
                    setMergeTargets((current) => ({
                      ...current,
                      [suggestion.id]: event.target.value,
                    }))
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 font-normal"
                >
                  {matches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </article>
          );
        })}
        {suggestions.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="font-medium text-slate-900">No {statusFilter} suggestions.</p>
            <p className="mt-2 text-sm text-slate-500">
              Use Import Suggestions to stage local text or CSV rows.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
