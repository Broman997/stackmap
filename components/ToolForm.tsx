"use client";

import { PAID_STATUSES, TOOL_CATEGORIES, TOOL_STATUSES } from "@/lib/constants";
import type { Tool } from "@/lib/types";
import { toNumber } from "@/lib/utils";
import { useState } from "react";

type ToolFormValue = Omit<Tool, "id" | "createdAt" | "updatedAt">;

const defaultValue: ToolFormValue = {
  name: "",
  category: "other",
  websiteUrl: "",
  loginUrl: "",
  accountEmail: "",
  paidStatus: "unknown",
  monthlyCost: 0,
  annualCost: 0,
  billingCycle: "",
  renewalDate: "",
  status: "active",
  notes: "",
};

export function ToolForm({
  initialValue,
  onSave,
  onCancel,
}: {
  initialValue?: Tool;
  onSave: (value: ToolFormValue) => void;
  onCancel: () => void;
}) {
  const value = initialValue ?? defaultValue;
  const [error, setError] = useState("");

  return (
    <form
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const name = String(formData.get("name") ?? "").trim();
        const monthlyCost = toNumber(formData.get("monthlyCost"));
        const annualCost = toNumber(formData.get("annualCost"));
        if (!name) {
          setError("Tool name is required.");
          return;
        }
        if (monthlyCost < 0 || annualCost < 0) {
          setError("Costs cannot be negative.");
          return;
        }
        setError("");
        onSave({
          name,
          category: String(formData.get("category") ?? "other") as ToolFormValue["category"],
          websiteUrl: String(formData.get("websiteUrl") ?? "").trim(),
          loginUrl: String(formData.get("loginUrl") ?? "").trim(),
          accountEmail: String(formData.get("accountEmail") ?? "").trim(),
          paidStatus: String(formData.get("paidStatus") ?? "unknown") as ToolFormValue["paidStatus"],
          monthlyCost,
          annualCost,
          billingCycle: String(formData.get("billingCycle") ?? "").trim(),
          renewalDate: String(formData.get("renewalDate") ?? ""),
          status: String(formData.get("status") ?? "active") as ToolFormValue["status"],
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
          Name
          <input name="name" required defaultValue={value.name} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Category
          <select name="category" defaultValue={value.category} className="rounded-md border border-slate-300 px-3 py-2 font-normal">
            {TOOL_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Status
          <select name="status" defaultValue={value.status} className="rounded-md border border-slate-300 px-3 py-2 font-normal">
            {TOOL_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Website URL
          <input name="websiteUrl" defaultValue={value.websiteUrl} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Login URL
          <input name="loginUrl" defaultValue={value.loginUrl} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Account Email
          <input name="accountEmail" type="email" defaultValue={value.accountEmail} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Paid Status
          <select name="paidStatus" defaultValue={value.paidStatus} className="rounded-md border border-slate-300 px-3 py-2 font-normal">
            {PAID_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Monthly Cost
          <input name="monthlyCost" type="number" step="0.01" min="0" defaultValue={value.monthlyCost} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Annual Cost
          <input name="annualCost" type="number" step="0.01" min="0" defaultValue={value.annualCost} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Billing Cycle
          <input name="billingCycle" defaultValue={value.billingCycle} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Renewal Date
          <input name="renewalDate" type="date" defaultValue={value.renewalDate} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
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
        <button type="submit" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Save Tool
        </button>
      </div>
    </form>
  );
}
