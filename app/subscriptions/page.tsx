"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { EntityTable, type TableColumn } from "@/components/EntityTable";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { useStackMapData } from "@/lib/storage";
import type { Subscription } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function SubscriptionsPage() {
  const { data, addSubscription, updateSubscription, deleteSubscription } = useStackMapData();
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [defaultToolId, setDefaultToolId] = useState<string | undefined>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toolId = params.get("toolId");
    if (toolId) {
      setDefaultToolId(toolId);
      setIsAdding(true);
    }
  }, []);

  const columns: TableColumn<Subscription>[] = [
    {
      header: "Vendor",
      cell: (item) => <span className="font-medium text-slate-950">{item.vendorName}</span>,
      sortValue: (item) => item.vendorName,
    },
    {
      header: "Tool",
      cell: (item) => data.tools.find((tool) => tool.id === item.toolId)?.name ?? "Unknown",
      sortValue: (item) => data.tools.find((tool) => tool.id === item.toolId)?.name ?? "",
    },
    {
      header: "Amount",
      cell: (item) => formatCurrency(item.amount, item.currency),
      sortValue: (item) => item.amount,
    },
    { header: "Cycle", cell: (item) => item.billingCycle, sortValue: (item) => item.billingCycle },
    {
      header: "Next Renewal",
      cell: (item) => formatDate(item.nextRenewalDate),
      sortValue: (item) => item.nextRenewalDate ? new Date(item.nextRenewalDate).getTime() : null,
    },
    { header: "Status", cell: (item) => item.status, sortValue: (item) => item.status },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Subscriptions</h1>
          <p className="mt-1 text-sm text-slate-600">Track manual billing records linked to tools.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
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
        items={data.subscriptions}
        columns={columns}
        emptyMessage="No subscriptions yet."
        emptyDetail="Add a subscription once a tool has a billing record to track."
        onEdit={setEditing}
        onDelete={(id) => {
          if (window.confirm("Delete this subscription?")) {
            deleteSubscription(id);
          }
        }}
      />
    </div>
  );
}
