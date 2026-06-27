"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useStackMapData } from "@/lib/storage";
import {
  getEntityName,
  getProjectReviewItems,
  getRelationshipLabel,
  getToolReviewItems,
} from "@/lib/utils";

type Result = {
  id: string;
  type: string;
  name: string;
  detail: string;
  href?: string;
};

export default function SearchPage() {
  const { data } = useStackMapData();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo<Result[]>(() => {
    const allResults: Result[] = [
      ...data.projects.map((project) => ({
        id: project.id,
        type: "Project",
        name: project.name,
        detail: `${project.type} / ${project.status} / ${getProjectReviewItems(project, data).length} review items`,
        href: `/projects/${project.id}`,
      })),
      ...data.tools.map((tool) => ({
        id: tool.id,
        type: "Tool",
        name: tool.name,
        detail: `${tool.category} / ${tool.paidStatus} / ${getToolReviewItems(tool, data).length} review items`,
        href: `/tools/${tool.id}`,
      })),
      ...data.subscriptions.map((subscription) => ({
        id: subscription.id,
        type: "Subscription",
        name: subscription.vendorName,
        detail: `${subscription.amount} ${subscription.currency} / ${subscription.billingCycle} / ${subscription.status}`,
        href: "/subscriptions",
      })),
      ...data.relationships.map((relationship) => ({
        id: relationship.id,
        type: "Relationship",
        name: `${getEntityName(data, relationship.fromType, relationship.fromId)} ${getRelationshipLabel(relationship.relationshipType)} ${getEntityName(data, relationship.toType, relationship.toId)}`,
        detail: relationship.notes || "No notes",
        href: "/relationships",
      })),
    ];

    if (!normalizedQuery) return allResults;
    return allResults.filter((result) =>
      `${result.type} ${result.name} ${result.detail}`.toLowerCase().includes(normalizedQuery),
    );
  }, [data, normalizedQuery]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Search</h1>
        <p className="mt-1 text-sm text-slate-600">
          Find projects, tools, subscriptions, and relationships in local StackMap data.
        </p>
      </header>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search names, categories, statuses, notes, and relationships"
          className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm shadow-sm"
        />
      </label>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-500">
          {results.length} result{results.length === 1 ? "" : "s"}
        </div>
        <div className="divide-y divide-slate-100">
          {results.map((result) => {
            const content = (
              <div className="px-4 py-3 hover:bg-slate-50">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {result.type}
                  </span>
                  <p className="font-medium text-slate-950">{result.name}</p>
                </div>
                <p className="mt-1 text-sm text-slate-500">{result.detail}</p>
              </div>
            );
            return result.href ? (
              <Link key={`${result.type}-${result.id}`} href={result.href} className="block">
                {content}
              </Link>
            ) : (
              <div key={`${result.type}-${result.id}`}>{content}</div>
            );
          })}
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              No local records match that search.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
