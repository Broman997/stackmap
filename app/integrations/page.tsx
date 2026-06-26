"use client";

import Link from "next/link";
import { useState } from "react";
import { INTEGRATION_STATUSES } from "@/lib/constants";
import { useStackMapData } from "@/lib/storage";
import type { IntegrationPlan } from "@/lib/types";

export default function IntegrationsPage() {
  const { data, updateIntegrationPlan } = useStackMapData();
  const [editing, setEditing] = useState<IntegrationPlan | null>(null);
  const planned = data.integrationPlans.filter((plan) => plan.status === "planned").length;
  const readyLater = data.integrationPlans.filter((plan) => plan.status === "ready_later").length;
  const disabled = data.integrationPlans.filter((plan) => plan.status === "disabled").length;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Integrations</h1>
        <p className="mt-1 text-sm text-slate-600">
          Future automation plans only. Nothing here connects to external services yet.
        </p>
      </header>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        All future integrations must be read-only, approval-based, and routed through
        Suggestions before anything becomes a confirmed StackMap record.
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Planned</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{planned}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Ready Later</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{readyLater}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Disabled</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{disabled}</p>
        </div>
      </section>

      {editing ? (
        <form
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            updateIntegrationPlan(editing.id, {
              status: String(formData.get("status") ?? editing.status) as IntegrationPlan["status"],
              notes: String(formData.get("notes") ?? "").trim(),
            });
            setEditing(null);
          }}
        >
          <div>
            <p className="text-sm font-medium text-slate-500">Editing</p>
            <h2 className="text-lg font-semibold text-slate-950">{editing.name}</h2>
          </div>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Status
            <select
              name="status"
              defaultValue={editing.status}
              className="rounded-md border border-slate-300 px-3 py-2 font-normal"
            >
              {INTEGRATION_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Notes
            <textarea
              name="notes"
              rows={4}
              defaultValue={editing.notes}
              className="rounded-md border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Save Plan
            </button>
          </div>
        </form>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {data.integrationPlans.map((plan) => (
          <article key={plan.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {plan.source}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">{plan.name}</h2>
              </div>
              <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                {plan.status}
              </span>
            </div>
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Access</dt>
                <dd className="font-medium text-slate-900">{plan.accessMode}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Approval Required</dt>
                <dd className="font-medium text-slate-900">{plan.approvalRequired ? "yes" : "no"}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-slate-600">{plan.notes}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditing(plan)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Edit Plan
              </button>
              {plan.source === "github" ? (
                <Link
                  href="/integrations/github"
                  className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Prepare GitHub
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
