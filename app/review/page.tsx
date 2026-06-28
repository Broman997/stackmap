"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { useStackMapData } from "@/lib/storage";
import { getProjectReviewItems, getToolReviewItems } from "@/lib/utils";

type ChecklistRecord = {
  id: string;
  name: string;
  href: string;
  editHref: string;
  kind: "Project" | "Tool";
  items: string[];
};

const PRIORITY_ITEMS = [
  "Missing project name",
  "Missing tool name",
  "Missing project type",
  "Missing tool category",
  "Missing project status",
  "Choose tool status",
  "Paid tool has no cost",
  "Missing annual renewal date",
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

export default function ReviewPage() {
  const { data } = useStackMapData();

  const records: ChecklistRecord[] = [
    ...data.projects.map((project) => ({
      id: project.id,
      name: project.name,
      href: `/projects/${project.id}`,
      editHref: `/projects?edit=${encodeURIComponent(project.id)}`,
      kind: "Project" as const,
      items: getProjectReviewItems(project, data),
    })),
    ...data.tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      href: `/tools/${tool.id}`,
      editHref: `/tools?edit=${encodeURIComponent(tool.id)}`,
      kind: "Tool" as const,
      items: getToolReviewItems(tool, data),
    })),
  ]
    .filter((record) => record.items.length > 0)
    .sort(sortChecklistRecords);

  const totalItems = records.reduce((sum, record) => sum + record.items.length, 0);
  const toolRecords = records.filter((record) => record.kind === "Tool").length;
  const projectRecords = records.filter((record) => record.kind === "Project").length;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Needs Attention</h1>
        <p className="mt-1 text-sm text-slate-600">
          Records with required fields or cost details that need to be fixed.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Issues" value={totalItems} detail="Required fixes" />
        <SummaryCard label="Records" value={records.length} detail="Projects and tools" />
        <SummaryCard label="Projects" value={projectRecords} detail="Need attention" />
        <SummaryCard label="Tools" value={toolRecords} detail="Need attention" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-950">Needs Attention</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use Fix to open the edit form. Optional notes, URLs, and relationships are not flagged here.
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    {record.items.map((item) => (
                      <span key={item} className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <Link
                  href={record.editHref}
                  className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Fix
                </Link>
              </div>
            </article>
          ))}

          {records.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="font-medium text-slate-900">Nothing needs attention right now.</p>
              <p className="mt-2 text-sm text-slate-500">
                New items will appear here only when required fields or cost details need fixing.
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
