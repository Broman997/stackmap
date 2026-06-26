"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useStackMapData } from "@/lib/storage";
import { formatDate, getProjectReviewItems, getToolReviewItems } from "@/lib/utils";

export default function ReviewPage() {
  const { data, markProjectReviewed, markToolReviewed } = useStackMapData();
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

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Review Needed</h1>
        <p className="mt-1 text-sm text-slate-600">
          Local checklist for records with missing details, stale reviews, or weak connections.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
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
      </section>

      <section className="space-y-3">
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
