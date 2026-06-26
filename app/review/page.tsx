"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useStackMapData } from "@/lib/storage";
import type { DuplicateDecisionStatus } from "@/lib/types";
import {
  cn,
  formatDate,
  getDuplicateReviewGroups,
  getProjectReviewItems,
  getToolReviewItems,
} from "@/lib/utils";

function duplicateDecisionLabel(
  status: DuplicateDecisionStatus | undefined,
  keepName?: string,
) {
  if (status === "merge_records") return keepName ? `Keep ${keepName}` : "Merge Later";
  if (status === "same_thing") return "Same Thing";
  if (status === "separate_records") return "Keep Both";
  if (status === "cleanup_needed") return "Cleanup Needed";
  return "Needs Decision";
}

export default function ReviewPage() {
  const {
    data,
    markProjectReviewed,
    markToolReviewed,
    setDuplicateDecision,
    clearDuplicateDecision,
    mergeDuplicateRecords,
    deleteProject,
    deleteTool,
  } = useStackMapData();
  const projectReviews = data.projects
    .map((project) => ({
      id: project.id,
      name: project.name,
      href: `/projects/${project.id}`,
      kind: "Project",
      lastReviewedAt: project.lastReviewedAt,
      items: getProjectReviewItems(project, data),
    }))
    .filter((item) => item.items.length > 0);
  const toolReviews = data.tools
    .map((tool) => ({
      id: tool.id,
      name: tool.name,
      href: `/tools/${tool.id}`,
      kind: "Tool",
      lastReviewedAt: tool.lastReviewedAt,
      items: getToolReviewItems(tool, data),
    }))
    .filter((item) => item.items.length > 0);
  const reviews = [...projectReviews, ...toolReviews];
  const duplicateReviews = getDuplicateReviewGroups(data);
  const duplicateDecisionsByGroup = new Map(
    data.duplicateDecisions.map((decision) => [decision.duplicateGroupId, decision]),
  );
  const visibleDuplicateReviews = duplicateReviews.filter(
    (group) => duplicateDecisionsByGroup.get(group.id)?.status !== "separate_records",
  );
  const duplicateDecisionCounts = duplicateReviews.reduce(
    (counts, group) => {
      const status = duplicateDecisionsByGroup.get(group.id)?.status;
      if (!status) counts.needsDecision += 1;
      else if (status === "merge_records" || status === "same_thing") counts.merge_records += 1;
      else counts[status] += 1;
      return counts;
    },
    {
      needsDecision: 0,
      merge_records: 0,
      separate_records: 0,
      cleanup_needed: 0,
    },
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Review Needed</h1>
        <p className="mt-1 text-sm text-slate-600">
          Local checklist for records with missing details, stale reviews, or weak connections.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Review Items</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {reviews.reduce((sum, item) => sum + item.items.length, 0)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Projects</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{projectReviews.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Tools</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{toolReviews.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Duplicate Decisions</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {duplicateDecisionCounts.needsDecision}
          </p>
          <p className="mt-1 text-xs text-slate-500">need a decision</p>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Duplicate Triage</h2>
          <p className="mt-1 text-sm text-slate-600">
            Merge one record into the other, delete one record, or mark the pair as separate.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">Needs Decision</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {duplicateDecisionCounts.needsDecision}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">Merge Later</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {duplicateDecisionCounts.merge_records}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">Keep Both</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {duplicateDecisionCounts.separate_records}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">Cleanup Needed</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {duplicateDecisionCounts.cleanup_needed}
            </p>
          </div>
        </div>
        {visibleDuplicateReviews.map((group) => (
          <article key={group.id} className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm">
            {(() => {
              const decision = duplicateDecisionsByGroup.get(group.id);
              const keepRecordName = group.records.find(
                (record) => record.id === decision?.keepRecordId,
              )?.name;
              return (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold uppercase text-amber-800">
                        {group.kind}
                      </span>
                      <p className="text-sm font-medium text-slate-700">{group.reason}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-semibold uppercase",
                        (decision?.status === "merge_records" ||
                          decision?.status === "same_thing") &&
                          "bg-cyan-50 text-cyan-800",
                        decision?.status === "separate_records" && "bg-emerald-50 text-emerald-800",
                        decision?.status === "cleanup_needed" && "bg-rose-50 text-rose-800",
                        !decision && "bg-slate-100 text-slate-600",
                      )}
                    >
                      {duplicateDecisionLabel(decision?.status, keepRecordName)}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {group.records.map((record) => (
                      <div key={record.id} className="rounded-md bg-slate-50 p-3">
                        <Link href={record.href} className="font-semibold text-slate-950 hover:underline">
                          {record.name}
                        </Link>
                        {record.sourceUrl ? (
                          <p className="mt-1 break-all text-xs text-slate-500">{record.sourceUrl}</p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-500">No source URL</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {group.records.map((record) => (
                      <button
                        key={`merge-${record.id}`}
                        type="button"
                        onClick={() => {
                          const removeRecord = group.records.find((item) => item.id !== record.id);
                          if (!removeRecord) return;
                          if (
                            window.confirm(
                              `Merge "${removeRecord.name}" into "${record.name}"? This copies missing details and relationships, then removes "${removeRecord.name}".`,
                            )
                          ) {
                            mergeDuplicateRecords(
                              group.kind,
                              record.id,
                              removeRecord.id,
                              group.id,
                            );
                          }
                        }}
                        className="rounded-md border border-cyan-300 px-3 py-2 text-left text-sm font-medium text-cyan-800 hover:bg-cyan-50"
                      >
                        <span className="block">Merge into {record.name}</span>
                        <span className="block text-xs text-cyan-700">
                          Keep this record
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setDuplicateDecision(group.id, "separate_records")}
                      className={cn(
                        "rounded-md border px-3 py-2 text-left text-sm font-medium",
                        decision?.status === "separate_records"
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-300 text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      <span className="block">Keep Both</span>
                      <span
                        className={cn(
                          "block text-xs",
                          decision?.status === "separate_records" ? "text-slate-200" : "text-slate-500",
                        )}
                      >
                        They are separate records
                      </span>
                    </button>
                    {group.records.map((record) => (
                      <button
                        key={`delete-${record.id}`}
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete "${record.name}"? This also removes its relationships${group.kind === "Tool" ? " and subscriptions" : ""}.`,
                            )
                          ) {
                            if (group.kind === "Project") deleteProject(record.id);
                            else deleteTool(record.id);
                          }
                        }}
                        className="rounded-md border border-rose-200 px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50"
                      >
                        <span className="block">Delete {record.name}</span>
                        <span className="block text-xs text-rose-600">
                          Remove this record
                        </span>
                      </button>
                    ))}
                    {decision ? (
                      <button
                        type="button"
                        onClick={() => clearDuplicateDecision(group.id)}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Clear Decision
                      </button>
                    ) : null}
                  </div>
                </>
              );
            })()}
          </article>
        ))}
        {visibleDuplicateReviews.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            No likely duplicate records found.
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Record Detail Checklist</h2>
          <p className="mt-1 text-sm text-slate-600">
            Use Mark Reviewed after you have checked a record's notes, links, cost, and relationships.
          </p>
        </div>
        {reviews.map((record) => (
          <article key={`${record.kind}-${record.id}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {record.kind}
                </p>
                <Link href={record.href} className="mt-1 inline-block text-lg font-semibold text-slate-950 hover:underline">
                  {record.name}
                </Link>
                <p className="mt-1 text-sm text-slate-500">
                  Last reviewed: {formatDate(record.lastReviewedAt ?? "")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (record.kind === "Project") markProjectReviewed(record.id);
                  else markToolReviewed(record.id);
                }}
                className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Mark Reviewed
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {record.items.map((item) => (
                <span key={item} className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  {item}
                </span>
              ))}
            </div>
          </article>
        ))}
        {reviews.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="font-medium text-slate-900">No review items right now.</p>
            <p className="mt-2 text-sm text-slate-500">
              Records will appear here when details are missing or reviews get stale.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
