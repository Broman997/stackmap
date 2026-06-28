"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Plus } from "lucide-react";
import { useStackMapData } from "@/lib/storage";
import {
  formatCurrency,
  formatDate,
  getEntityName,
  getRelationshipLabel,
  getToolReviewItems,
} from "@/lib/utils";

export default function ToolDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, markToolReviewed } = useStackMapData();
  const tool = data.tools.find((item) => item.id === params.id);

  if (!tool) {
    return (
      <div className="space-y-4">
        <Link href="/tools" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Tools
        </Link>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-950">Tool not found</h1>
          <p className="mt-2 text-sm text-slate-500">This local tool record does not exist.</p>
        </div>
      </div>
    );
  }

  const reviewItems = getToolReviewItems(tool, data);
  const relationships = data.relationships.filter(
    (relationship) =>
      (relationship.fromType === "tool" && relationship.fromId === tool.id) ||
      (relationship.toType === "tool" && relationship.toId === tool.id),
  );
  const subscriptions = data.subscriptions.filter((subscription) => subscription.toolId === tool.id);

  return (
    <div className="space-y-5">
      <Link href="/tools" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Tools
      </Link>
      <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-amber-700">{tool.category}</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">{tool.name}</h1>
            <p className="mt-2 text-sm text-slate-600">{tool.notes || "No notes yet."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/relationships?fromType=tool&fromId=${encodeURIComponent(tool.id)}`}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Relationship
            </Link>
            <Link
              href={`/subscriptions?toolId=${encodeURIComponent(tool.id)}`}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Subscription
            </Link>
            <button
              type="button"
              onClick={() => markToolReviewed(tool.id)}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Mark Reviewed
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Details</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Status</dt><dd className="font-medium text-slate-900">{tool.status}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Paid</dt><dd className="font-medium text-slate-900">{tool.paidStatus}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Renewal</dt><dd className="font-medium text-slate-900">{formatDate(tool.renewalDate)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Last reviewed</dt><dd className="font-medium text-slate-900">{formatDate(tool.lastReviewedAt ?? "")}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Source</dt><dd className="font-medium text-slate-900">{tool.source ?? "manual"}</dd></div>
            {tool.primaryLanguage ? (
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Language</dt><dd className="font-medium text-slate-900">{tool.primaryLanguage}</dd></div>
            ) : null}
            {tool.sourceVisibility ? (
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Visibility</dt><dd className="font-medium text-slate-900">{tool.sourceVisibility}</dd></div>
            ) : null}
            {tool.lastDetectedAt ? (
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Last detected</dt><dd className="font-medium text-slate-900">{formatDate(tool.lastDetectedAt)}</dd></div>
            ) : null}
            {tool.sourceUrl ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Source URL</dt>
                <dd className="min-w-0 text-right font-medium text-slate-900">
                  <a href={tool.sourceUrl} target="_blank" rel="noreferrer" className="break-all text-indigo-600 hover:text-indigo-800">
                    {tool.sourceName || tool.sourceUrl}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Cost</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Monthly</dt><dd className="font-medium text-slate-900">{formatCurrency(tool.monthlyCost)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Annual</dt><dd className="font-medium text-slate-900">{formatCurrency(tool.annualCost)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Cycle</dt><dd className="font-medium text-slate-900">{tool.billingCycle || "Not set"}</dd></div>
          </dl>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Review Needed</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {reviewItems.length ? reviewItems.map((item) => (
              <span key={item} className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">{item}</span>
            )) : <p className="text-sm text-slate-500">No obvious review items.</p>}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Subscriptions</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {subscriptions.map((subscription) => (
              <p key={subscription.id} className="py-3 text-sm text-slate-700">
                {subscription.vendorName}: {formatCurrency(subscription.amount, subscription.currency)} / {subscription.billingCycle}
              </p>
            ))}
            {subscriptions.length === 0 ? <p className="py-3 text-sm text-slate-500">No linked subscriptions.</p> : null}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Relationships</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {relationships.map((relationship) => (
            <p key={relationship.id} className="py-3 text-sm text-slate-700">
                {getEntityName(data, relationship.fromType, relationship.fromId)} {getRelationshipLabel(relationship.relationshipType)} {getEntityName(data, relationship.toType, relationship.toId)}
              </p>
            ))}
            {relationships.length === 0 ? <p className="py-3 text-sm text-slate-500">No relationships yet.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
