"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { EntityTable, type TableColumn } from "@/components/EntityTable";
import { ToolForm } from "@/components/ToolForm";
import { PAID_STATUSES, TOOL_CATEGORIES, TOOL_STATUSES } from "@/lib/constants";
import { useStackMapData } from "@/lib/storage";
import type { Tool } from "@/lib/types";
import { formatCurrency, formatDate, getToolReviewItems } from "@/lib/utils";

export default function ToolsPage() {
  const { data, addTool, updateTool, deleteTool } = useStackMapData();
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<Tool | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paidFilter, setPaidFilter] = useState("all");

  const filteredTools = data.tools.filter(
    (tool) =>
      (categoryFilter === "all" || tool.category === categoryFilter) &&
      (statusFilter === "all" || tool.status === statusFilter) &&
      (paidFilter === "all" || tool.paidStatus === paidFilter),
  );

  const columns: TableColumn<Tool>[] = [
    {
      header: "Name",
      cell: (item) => <span className="font-medium text-slate-950">{item.name}</span>,
      sortValue: (item) => item.name,
    },
    { header: "Category", cell: (item) => item.category, sortValue: (item) => item.category },
    { header: "Paid", cell: (item) => item.paidStatus, sortValue: (item) => item.paidStatus },
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
      header: "Review",
      cell: (item) => {
        const count = getToolReviewItems(item, data).length;
        return count ? `${count} item${count === 1 ? "" : "s"}` : "Clear";
      },
      sortValue: (item) => getToolReviewItems(item, data).length,
    },
    { header: "Status", cell: (item) => item.status, sortValue: (item) => item.status },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Tools</h1>
          <p className="mt-1 text-sm text-slate-600">Track services, apps, accounts, and tool notes manually.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Tool
        </button>
      </header>

      {(isAdding || editing) && (
        <ToolForm
          key={editing ? editing.id : "new-tool"}
          existingTools={data.tools}
          initialValue={editing ?? undefined}
          onSelectExistingTool={(tool) => {
            setEditing(tool);
            setIsAdding(false);
          }}
          onCancel={() => {
            setIsAdding(false);
            setEditing(null);
          }}
          onSave={(value) => {
            if (editing) updateTool(editing.id, value);
            else addTool(value);
            setIsAdding(false);
            setEditing(null);
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
        onEdit={setEditing}
        onDelete={(id) => {
          if (window.confirm("Delete this tool, its subscriptions, and its relationships?")) {
            deleteTool(id);
          }
        }}
      />
    </div>
  );
}
