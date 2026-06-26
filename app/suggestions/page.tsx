"use client";

import { Check, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useStackMapData } from "@/lib/storage";
import type { ProjectType, Suggestion, SuggestionStatus, ToolCategory } from "@/lib/types";

function textField(suggestion: Suggestion, key: string, fallback = "") {
  const value = suggestion.detectedFields[key];
  return typeof value === "string" ? value : fallback;
}

function numberField(suggestion: Suggestion, key: string, fallback = 0) {
  const value = suggestion.detectedFields[key];
  return typeof value === "number" ? value : fallback;
}

export default function SuggestionsPage() {
  const {
    data,
    addProject,
    addTool,
    updateSuggestionStatus,
    deleteSuggestion,
  } = useStackMapData();
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus>("pending");
  const suggestions = data.suggestions.filter((item) => item.status === statusFilter);
  const counts = {
    pending: data.suggestions.filter((item) => item.status === "pending").length,
    accepted: data.suggestions.filter((item) => item.status === "accepted").length,
    dismissed: data.suggestions.filter((item) => item.status === "dismissed").length,
  };

  function acceptSuggestion(suggestion: Suggestion) {
    if (suggestion.entityType === "project") {
      addProject({
        name: textField(suggestion, "name", "Untitled Project"),
        type: textField(suggestion, "type", "other") as ProjectType,
        status: "active",
        notes: suggestion.notes || textField(suggestion, "notes"),
        lastReviewedAt: "",
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

      <section className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
      </section>

      <section className="space-y-3">
        {suggestions.map((suggestion) => (
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
                    {textField(suggestion, "name", "Unnamed suggestion")}
                  </p>
                </div>
                <p className="mt-2 text-sm text-slate-600">{suggestion.notes || "No notes."}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Confidence: {Math.round(suggestion.confidence * 100)}%
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => acceptSuggestion(suggestion)}
                  disabled={suggestion.status !== "pending" || !["project", "tool"].includes(suggestion.entityType)}
                  className="rounded-md border border-emerald-200 p-2 text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                  aria-label="Accept suggestion"
                  title="Accept suggestion"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => updateSuggestionStatus(suggestion.id, "dismissed")}
                  disabled={suggestion.status !== "pending"}
                  className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                  aria-label="Dismiss suggestion"
                  title="Dismiss suggestion"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteSuggestion(suggestion.id)}
                  className="rounded-md border border-rose-200 p-2 text-rose-700 hover:bg-rose-50"
                  aria-label="Delete suggestion"
                  title="Delete suggestion"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600 sm:grid-cols-2">
              {Object.entries(suggestion.detectedFields).map(([key, value]) => (
                <p key={key}>
                  <span className="font-medium text-slate-800">{key}:</span>{" "}
                  {String(value ?? "")}
                </p>
              ))}
            </div>
          </article>
        ))}
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
