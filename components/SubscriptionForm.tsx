"use client";

import { DEFAULT_CURRENCY, SUBSCRIPTION_STATUSES } from "@/lib/constants";
import type { Subscription, Tool } from "@/lib/types";
import { toNumber } from "@/lib/utils";
import { useState } from "react";

type SubscriptionFormValue = Omit<Subscription, "id" | "createdAt" | "updatedAt">;

export function SubscriptionForm({
  tools,
  initialValue,
  defaultToolId,
  onSave,
  onCancel,
}: {
  tools: Tool[];
  initialValue?: Subscription;
  defaultToolId?: string;
  onSave: (value: SubscriptionFormValue) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState("");
  const safeDefaultToolId = tools.some((tool) => tool.id === defaultToolId)
    ? defaultToolId
    : tools[0]?.id;
  const value: SubscriptionFormValue = initialValue ?? {
    toolId: safeDefaultToolId ?? "",
    vendorName: "",
    amount: 0,
    currency: DEFAULT_CURRENCY,
    billingCycle: "monthly",
    nextRenewalDate: "",
    paymentMethod: "",
    status: "active",
    notes: "",
  };

  return (
    <form
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const vendorName = String(formData.get("vendorName") ?? "").trim();
        const amount = toNumber(formData.get("amount"));
        if (tools.length === 0) {
          setError("Add a tool before creating a subscription.");
          return;
        }
        if (!vendorName) {
          setError("Vendor name is required.");
          return;
        }
        if (amount < 0) {
          setError("Amount cannot be negative.");
          return;
        }
        setError("");
        onSave({
          toolId: String(formData.get("toolId") ?? ""),
          vendorName,
          amount,
          currency: String(formData.get("currency") ?? DEFAULT_CURRENCY).trim(),
          billingCycle: String(formData.get("billingCycle") ?? "").trim(),
          nextRenewalDate: String(formData.get("nextRenewalDate") ?? ""),
          paymentMethod: String(formData.get("paymentMethod") ?? "").trim(),
          status: String(formData.get("status") ?? "active") as SubscriptionFormValue["status"],
          notes: String(formData.get("notes") ?? "").trim(),
        });
      }}
    >
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Tool
          <select key={`tool-${value.toolId}`} name="toolId" required defaultValue={value.toolId} className="rounded-md border border-slate-300 px-3 py-2 font-normal">
            {tools.map((tool) => (
              <option key={tool.id} value={tool.id}>
                {tool.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Vendor
          <input name="vendorName" required defaultValue={value.vendorName} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Amount
          <input name="amount" type="number" step="0.01" min="0" defaultValue={value.amount} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Currency
          <input name="currency" defaultValue={value.currency} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Billing Cycle
          <input name="billingCycle" defaultValue={value.billingCycle} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Next Renewal
          <input name="nextRenewalDate" type="date" defaultValue={value.nextRenewalDate} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Payment Method
          <input name="paymentMethod" defaultValue={value.paymentMethod} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Status
          <select name="status" defaultValue={value.status} className="rounded-md border border-slate-300 px-3 py-2 font-normal">
            {SUBSCRIPTION_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Notes
        <textarea name="notes" rows={3} defaultValue={value.notes} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Cancel
        </button>
        <button type="submit" disabled={tools.length === 0} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          Save Subscription
        </button>
      </div>
    </form>
  );
}
