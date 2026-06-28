"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useStackMapData } from "@/lib/storage";
import { formatDate, getProjectReviewItems, getToolReviewItems } from "@/lib/utils";

type ChecklistRecord = {
  id: string;
  name: string;
  href: string;
  kind: "Project" | "Tool";
  lastReviewedAt?: string;
  items: string[];
};

const PRIORITY_ITEMS = [
  "Unknown paid status",
  "Missing renewal details",
  "No relationships",
  "Missing login URL",
  "Missing notes",
  "Never reviewed",
  "Review is older than 90 days",
  "Review tool status",
  "Not active",
];

function sortChecklistRecords(first: ChecklistRecord, second: ChecklistRecord) {
  const firstPriority = Math.min(
    ...first.items.map((item) => {
      const index = PRIORITY_ITEMS.indexOf(item);
      return index === -1 ? PRIORITY_ITEMS.length : index;
    }),
  );
  const secondPriority = Math.min(
    ...second.items.map((item) => {
      const index = PRIORITY_ITEMS.indexOf(item);
      return index === -1 ? PRIORITY_ITEMS.length : index;
    }),
  );

  return (
    firstPriority - secondPriority ||
    second.items.length - first.items.length ||
    first.name.localeCompare(second.name, undefined, { sensitivity: "base" })
  );
}

function countRecordsWith(records: ChecklistRecord[], label: string) {
  return records.filter((record) => record.items.includes(label)).length;
}

export default function ReviewPage() {
  const { data, markProjectReviewed, markToolReviewed } = useStackMapData();

  const records: ChecklistRecord[] = [
    ...data.projects.map((project) => ({
      id: project.id,
      name: project.name,
      href: `/projects/${project.id}`,
      kind: "Project" as const,
      lastReviewedAt: project.lastReviewedAt,
      items: getProjectReviewItems(project, data),
    })),
    ...data.tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      href: `/tools/${tool.id}`,
      kind: "Tool" as const,
      lastReviewedAt: tool.lastReviewedAt,
      items: getToolReviewItems(tool, data),
    })),
  ]
    .filter((record) => record.items.length > 0)
    .sort(sortChecklistRecords);

  const totalItems = records.reduce((sum, record) => sum + record.items.length, 0);
  const missingRelationships = countRecordsWith(records, "No relationships");
  const unknownPaid = countRecordsWith(records, "Unknown paid status");

  function markReviewed(record: ChecklistRecord) {
    if (record.kind === "Project") markProjectReviewed(record.id);
    else markToolReviewed(record.id);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Checklist</h1>
        <p className="mt-1 text-sm text-slate-600">
          Records that may need missing costs, links, notes, review dates, or relationships.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Checklist Items" value={totalItems} detail="Total things to check" />
        <SummaryCard label="Records" value={records.length} detail="Projects and tools" />
        <SummaryCard label="Unknown Paid" value={unknownPaid} detail="Tools needing cost status" />
        <SummaryCard label="No Relationships" value={missingRelationships} detail="Records not connected yet" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-950">Needs Attention</h2>
          <p className="mt-1 text-sm text-slate-500">
            Open a record to fill in details, then mark it reviewed when it looks right.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {records.map((record) => (
            <article key={`${record.kind}-${record.id}`} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold uppercase text-slate-600">
                      {record.kind}
                    </span>
                    <Link href={record.href} className="text-lg font-semibold text-slate-950 hover:underline">
                      {record.name}
                    </Link>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Last reviewed: {formatDate(record.lastReviewedAt ?? "")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {record.items.map((item) => (
                      <span key={item} className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={record.href}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => markReviewed(record)}
                    className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Mark Reviewed
                  </button>
                </div>
              </div>
            </article>
          ))}

          {records.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="font-medium text-slate-900">Nothing needs attention right now.</p>
              <p className="mt-2 text-sm text-slate-500">
                New checklist items will appear here when records are missing details or reviews get stale.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </section>
  );
}
