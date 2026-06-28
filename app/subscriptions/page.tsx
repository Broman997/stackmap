"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EntityTable, type TableColumn } from "@/components/EntityTable";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { useStackMapData } from "@/lib/storage";
import type { Subscription } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";

type BillingRow = {
  id: string;
  kind: "subscription" | "tool";
  toolId: string;
  name: string;
  toolName: string;
  amount: number;
  monthlyCost: number;
  annualCost: number;
  currency: string;
  cycle: string;
  renewal: string;
  status: string;
};

export default function SubscriptionsPage() {
  const router = useRouter();
  const { data, addSubscription, updateSubscription, deleteSubscription, updateTool } = useStackMapData();
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [defaultToolId, setDefaultToolId] = useState<string | undefined>();

  useEffect(() => {
    window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const toolId = params.get("toolId");
      if (toolId) {
        setDefaultToolId(toolId);
        setIsAdding(true);
      }
    }, 0);
  }, []);

  const rows = useMemo<BillingRow[]>(() => {
    const toolsWithSubscription = new Set(data.subscriptions.map((s) => s.toolId));

    const subRows: BillingRow[] = data.subscriptions.map((sub) => ({
      id: sub.id,
      kind: "subscription" as const,
      toolId: sub.toolId,
      name: sub.vendorName,
      toolName: data.tools.find((t) => t.id === sub.toolId)?.name ?? "Unknown",
      amount: sub.amount,
      monthlyCost: 0,
      annualCost: 0,
      currency: sub.currency,
      cycle: sub.billingCycle,
      renewal: sub.nextRenewalDate,
      status: sub.status,
    }));

    const toolRows: BillingRow[] = data.tools
      .filter(
        (tool) =>
          (tool.paidStatus === "paid" || tool.paidStatus === "credits") &&
          (tool.monthlyCost > 0 || tool.annualCost > 0) &&
          !toolsWithSubscription.has(tool.id),
      )
      .map((tool) => ({
        id: `tool-${tool.id}`,
        kind: "tool" as const,
        toolId: tool.id,
        name: tool.name,
        toolName: tool.name,
        amount: 0,
        monthlyCost: tool.monthlyCost,
        annualCost: tool.annualCost,
        currency: "USD",
        cycle: tool.billingCycle,
        renewal: tool.renewalDate,
        status: tool.status,
      }));

    return [...subRows, ...toolRows];
  }, [data.subscriptions, data.tools]);

  const columns: TableColumn<BillingRow>[] = [
    {
      header: "Name",
      cell: (item) => <span className="font-medium text-slate-950">{item.name}</span>,
      sortValue: (item) => item.name,
    },
    {
      header: "Category",
      cell: (item) => data.tools.find((t) => t.id === item.toolId)?.category ?? "—",
      sortValue: (item) => data.tools.find((t) => t.id === item.toolId)?.category ?? "",
    },
    {
      header: "Amount",
      cell: (item) => {
        if (item.kind === "subscription") return formatCurrency(item.amount, item.currency);
        const parts: string[] = [];
        if (item.monthlyCost > 0) parts.push(`${formatCurrency(item.monthlyCost)}/mo`);
        if (item.annualCost > 0) parts.push(`${formatCurrency(item.annualCost)}/yr`);
        return parts.length ? parts.join(", ") : "—";
      },
      sortValue: (item) =>
        item.kind === "subscription" ? item.amount : item.monthlyCost || item.annualCost / 12,
    },
    {
      header: "Cycle",
      cell: (item) => item.cycle || "—",
      sortValue: (item) => item.cycle,
    },
    {
      header: "Renewal",
      cell: (item) => formatDate(item.renewal),
      sortValue: (item) => (item.renewal ? new Date(item.renewal).getTime() : null),
    },
    {
      header: "Status",
      cell: (item) => <StatusBadge value={item.status} />,
      sortValue: (item) => item.status,
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Subscriptions</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track manual billing records linked to tools.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Subscription
        </button>
      </header>

      {(isAdding || editing) && (
        <SubscriptionForm
          tools={data.tools}
          initialValue={editing ?? undefined}
          defaultToolId={!editing ? defaultToolId : undefined}
          onCancel={() => {
            setIsAdding(false);
            setEditing(null);
            setDefaultToolId(undefined);
          }}
          onSave={(value) => {
            if (editing) updateSubscription(editing.id, value);
            else addSubscription(value);
            setIsAdding(false);
            setEditing(null);
            setDefaultToolId(undefined);
          }}
        />
      )}

      <EntityTable
        items={rows}
        columns={columns}
        emptyMessage="No billing records yet."
        emptyDetail="Add a subscription or set costs on a tool to track billing here."
        getViewHref={(item) => `/tools/${item.toolId}`}
        onEdit={(item) => {
          if (item.kind === "subscription") {
            const sub = data.subscriptions.find((s) => s.id === item.id);
            if (sub) setEditing(sub);
          } else {
            router.push(`/tools/${item.toolId}`);
          }
        }}
        onDelete={(id) => {
          const row = rows.find((r) => r.id === id);
          if (!row) return;
          if (row.kind === "subscription") {
            if (window.confirm("Delete this subscription record?")) {
              deleteSubscription(id);
            }
          } else {
            const tool = data.tools.find((t) => t.id === row.toolId);
            if (!tool) return;
            if (window.confirm(`Clear cost tracking for ${tool.name}? This will set monthly and annual costs to $0 on the tool record.`)) {
              updateTool(tool.id, { ...tool, monthlyCost: 0, annualCost: 0 });
            }
          }
        }}
      />
    </div>
  );
}
