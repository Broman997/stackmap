"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useStackMapData } from "@/lib/storage";
import {
  formatCurrency,
  formatDate,
  getEntityName,
  getProjectReviewItems,
  getRelationshipLabel,
  getToolReviewItems,
} from "@/lib/utils";

type ResultGroup = "Projects" | "Tools" | "Subscriptions" | "Relationships";

type Result = {
  id: string;
  group: ResultGroup;
  label: string;
  title: string;
  subtitle: string;
  meta: string;
  href: string;
  searchText: string;
};

const GROUPS: ResultGroup[] = ["Projects", "Tools", "Subscriptions", "Relationships"];

function alphabetizeResults(first: Result, second: Result) {
  return first.title.localeCompare(second.title, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function getSearchRank(result: Result, query: string) {
  const title = result.title.toLowerCase();
  const label = result.label.toLowerCase();
  const meta = result.meta.toLowerCase();
  const subtitle = result.subtitle.toLowerCase();

  if (title === query) return 0;
  if (title.startsWith(query)) return 1;
  if (title.includes(query)) return 2;
  if (label.includes(query) || meta.includes(query)) return 3;
  if (subtitle.includes(query)) return 4;
  return 5;
}

export default function SearchPage() {
  const { data } = useStackMapData();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo<Result[]>(() => {
    const allResults: Result[] = [
      ...data.projects.map((project) => ({
        id: project.id,
        group: "Projects" as const,
        label: project.type,
        title: project.name,
        subtitle: project.notes || "No notes",
        meta: `${project.status} / ${getProjectReviewItems(project, data).length} review items`,
        href: `/projects/${project.id}`,
        searchText: [
          "project",
          project.name,
          project.type,
          project.status,
          project.notes,
        ].join(" "),
      })),
      ...data.tools.map((tool) => ({
        id: tool.id,
        group: "Tools" as const,
        label: tool.category,
        title: tool.name,
        subtitle: tool.notes || tool.websiteUrl || "No notes",
        meta: `${tool.status} / ${tool.paidStatus} / ${getToolReviewItems(tool, data).length} review items`,
        href: `/tools/${tool.id}`,
        searchText: [
          "tool",
          tool.name,
          tool.category,
          tool.status,
          tool.paidStatus,
          tool.billingCycle,
          tool.websiteUrl,
          tool.loginUrl,
          tool.accountEmail,
          tool.notes,
        ].join(" "),
      })),
      ...data.subscriptions.map((subscription) => ({
        id: subscription.id,
        group: "Subscriptions" as const,
        label: subscription.status,
        title: subscription.vendorName,
        subtitle: subscription.notes || "No notes",
        meta: `${formatCurrency(subscription.amount, subscription.currency)} / ${subscription.billingCycle}${
          subscription.nextRenewalDate ? ` / renews ${formatDate(subscription.nextRenewalDate)}` : ""
        }`,
        href: "/subscriptions",
        searchText: [
          "subscription",
          subscription.vendorName,
          subscription.amount,
          subscription.currency,
          subscription.billingCycle,
          subscription.status,
          subscription.nextRenewalDate,
          subscription.paymentMethod,
          subscription.notes,
        ].join(" "),
      })),
      ...data.relationships.map((relationship) => ({
        id: relationship.id,
        group: "Relationships" as const,
        label: getRelationshipLabel(relationship.relationshipType),
        title: `${getEntityName(data, relationship.fromType, relationship.fromId)} ${getRelationshipLabel(relationship.relationshipType)} ${getEntityName(data, relationship.toType, relationship.toId)}`,
        subtitle: relationship.notes || "No notes",
        meta: `${relationship.fromType} -> ${relationship.toType}`,
        href: "/relationships",
        searchText: [
          "relationship",
          getEntityName(data, relationship.fromType, relationship.fromId),
          getRelationshipLabel(relationship.relationshipType),
          getEntityName(data, relationship.toType, relationship.toId),
          relationship.notes,
        ].join(" "),
      })),
    ];

    if (!normalizedQuery) return [...allResults].sort(alphabetizeResults);

    return allResults
      .filter((result) => result.searchText.toLowerCase().includes(normalizedQuery))
      .sort((first, second) => {
        const rankDifference =
          getSearchRank(first, normalizedQuery) - getSearchRank(second, normalizedQuery);

        return rankDifference || alphabetizeResults(first, second);
      });
  }, [data, normalizedQuery]);

  const groupedResults = GROUPS.map((group) => ({
    group,
    items: results.filter((result) => result.group === group),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Find</h1>
        <p className="mt-1 text-sm text-slate-600">
          Search your local projects, tools, costs, renewals, notes, and relationships.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a project, tool, subscription, relationship, cost, renewal, or note"
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <p className="mt-3 text-sm text-slate-500">
          {normalizedQuery
            ? `${results.length} match${results.length === 1 ? "" : "es"} for "${query.trim()}"`
            : `${results.length} local record${results.length === 1 ? "" : "s"} available to search`}
        </p>
      </section>

      {groupedResults.map((section) => (
        <section key={section.group} className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-950">{section.group}</h2>
            <span className="text-sm text-slate-500">{section.items.length}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {section.items.map((result) => (
              <Link key={`${result.group}-${result.id}`} href={result.href} className="block px-4 py-3 hover:bg-indigo-50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        {result.label}
                      </span>
                      <p className="font-medium text-slate-950">{result.title}</p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{result.subtitle}</p>
                  </div>
                  <p className="text-sm text-slate-500">{result.meta}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {results.length === 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
          No local records match that search.
        </section>
      ) : null}
    </div>
  );
}
