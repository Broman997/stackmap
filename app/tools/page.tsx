"use client";

import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { EntityTable, type TableColumn } from "@/components/EntityTable";
import { ToolForm } from "@/components/ToolForm";
import { PAID_STATUSES, TOOL_CATEGORIES, TOOL_STATUSES } from "@/lib/constants";
import { useStackMapData } from "@/lib/storage";
import type { Tool } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate, getToolReviewItems } from "@/lib/utils";

export default function ToolsPage() {
  return (
    <Suspense fallback={<ToolsPageLoading />}>
      <ToolsPageContent />
    </Suspense>
  );
}

function ToolsPageLoading() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Tools</h1>
        <p className="mt-1 text-sm text-slate-600">Loading tools...</p>
      </header>
    </div>
  );
}

function ToolsPageContent() {
  const searchParams = useSearchParams();
  return <ToolsPageState key={searchParams.toString()} searchParams={searchParams} />;
}

function ToolsPageState({ searchParams }: { searchParams: URLSearchParams }) {
  const { data, addTool, updateTool, deleteTool } = useStackMapData();
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<Tool | null>(null);

  function startEditing(tool: Tool) {
    setEditing(tool);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const [categoryFilter, setCategoryFilter] = useState(() =>
    getQueryFilter(searchParams, "category", TOOL_CATEGORIES),
  );
  const [statusFilter, setStatusFilter] = useState(() =>
    getQueryFilter(searchParams, "status", TOOL_STATUSES),
  );
  const [paidFilter, setPaidFilter] = useState(() =>
    getQueryFilter(searchParams, "paid", PAID_STATUSES),
  );
  const [costFilter, setCostFilter] = useState(() => getCostFilter(searchParams));

  function clearEditQuery() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("edit")) return;

    params.delete("edit");
    const query = params.toString();
    window.history.replaceState(null, "", `/tools${query ? `?${query}` : ""}`);
  }

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || editing?.id === editId) return;

    const tool = data.tools.find((item) => item.id === editId);
    if (!tool) return;

    const timeoutId = window.setTimeout(() => {
      setEditing(tool);
      setIsAdding(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [data.tools, editing?.id, searchParams]);

  const filteredTools = data.tools.filter(
    (tool) =>
      (categoryFilter === "all" || tool.category === categoryFilter) &&
      (statusFilter === "all" || tool.status === statusFilter) &&
      (paidFilter === "all" || tool.paidStatus === paidFilter) &&
      (costFilter === "all" || tool.monthlyCost > 0 || tool.annualCost > 0),
  );

  const columns: TableColumn<Tool>[] = [
    {
      header: "Name",
      cell: (item) => <span className="font-medium text-slate-950">{item.name}</span>,
      sortValue: (item) => item.name,
    },
    { header: "Category", cell: (item) => item.category, sortValue: (item) => item.category },
    { header: "Paid", cell: (item) => <StatusBadge value={item.paidStatus} />, sortValue: (item) => item.paidStatus },
    {
      header: "Cost",
      cell: (item) => `${formatCurrency(item.monthlyCost)}/mo, ${formatCurrency(item.annualCost)}/yr`,
      sortValue: (item) => item.monthlyCost + item.annualCost / 12,
    },
    {
      header: "Renewal",
      cell: (item) => formatDate(item.renewalDate),
      sortValue: (item) => item.renewalDate ? new Date(item.renewalDate).getTime() : null,
    },
    {
      header: "Attention",
      cell: (item) => {
        const count = getToolReviewItems(item, data).length;
        return count ? `${count} item${count === 1 ? "" : "s"}` : "Clear";
      },
      sortValue: (item) => getToolReviewItems(item, data).length,
    },
    { header: "Status", cell: (item) => <StatusBadge value={item.status} />, sortValue: (item) => item.status },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Tools</h1>
          <p className="mt-1 text-sm text-slate-600">Track services, apps, accounts, and tool notes manually.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Tool
        </button>
      </header>

      {(isAdding || editing) && (
        <ToolForm
          key={editing ? editing.id : "new-tool"}
          existingTools={data.tools}
          initialValue={editing ?? undefined}
          reviewItems={editing ? getToolReviewItems(editing, data) : []}
          onSelectExistingTool={(tool) => {
            startEditing(tool);
            setIsAdding(false);
          }}
          onCancel={() => {
            setIsAdding(false);
            setEditing(null);
            clearEditQuery();
          }}
          onSave={(value) => {
            if (editing) updateTool(editing.id, value);
            else addTool(value);
            setIsAdding(false);
            setEditing(null);
            clearEditQuery();
          }}
        />
      )}

      <section className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Category
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 font-normal">
            <option value="all">All categories</option>
            {TOOL_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 font-normal">
            <option value="all">All statuses</option>
            {TOOL_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Paid Status
          <select value={paidFilter} onChange={(event) => setPaidFilter(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 font-normal">
            <option value="all">All paid statuses</option>
            {PAID_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Cost
          <select value={costFilter} onChange={(event) => setCostFilter(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 font-normal">
            <option value="all">All costs</option>
            <option value="tracked">Costs entered</option>
          </select>
        </label>
        <p className="text-sm text-slate-500">
          Showing {filteredTools.length} of {data.tools.length}
        </p>
      </section>

      <EntityTable
        items={filteredTools}
        columns={columns}
        emptyMessage="No tools match the current filters."
        emptyDetail="Clear the filters or add a new tool record."
        getViewHref={(item) => `/tools/${item.id}`}
        onEdit={startEditing}
        onDelete={(id) => {
          if (window.confirm("Delete this tool, its subscriptions, and its relationships?")) {
            deleteTool(id);
          }
        }}
      />
    </div>
  );
}

function getQueryFilter(
  searchParams: URLSearchParams,
  key: string,
  allowedValues: readonly string[],
) {
  const value = searchParams.get(key);
  return value && allowedValues.includes(value) ? value : "all";
}

function getCostFilter(searchParams: URLSearchParams) {
  return searchParams.get("cost") === "tracked" ? "tracked" : "all";
}
