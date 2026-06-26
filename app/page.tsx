"use client";

import { AlertCircle, CalendarClock, CreditCard, FolderKanban, Wrench } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useStackMapData } from "@/lib/storage";
import { formatCurrency, formatDate } from "@/lib/utils";

function monthlyEquivalent(amount: number, cycle: string) {
  const normalized = cycle.toLowerCase();
  if (normalized.includes("annual") || normalized.includes("year")) return amount / 12;
  if (normalized.includes("quarter")) return amount / 3;
  if (normalized.includes("week")) return amount * 4.33;
  if (normalized.includes("one-time") || normalized.includes("none")) return 0;
  return amount;
}

export default function DashboardPage() {
  const { data } = useStackMapData();
  const activeSubscriptions = data.subscriptions.filter((item) =>
    ["active", "trial"].includes(item.status),
  );
  const subscriptionMonthly = activeSubscriptions.reduce(
    (sum, item) => sum + monthlyEquivalent(item.amount, item.billingCycle),
    0,
  );
  const toolMonthly = data.tools.reduce(
    (sum, tool) => sum + tool.monthlyCost + tool.annualCost / 12,
    0,
  );
  const unknownPaidTools = data.tools.filter((tool) => tool.paidStatus === "unknown");
  const upcomingRenewals = [
    ...data.subscriptions
      .filter((item) => item.nextRenewalDate)
      .map((item) => ({
        id: item.id,
        name: item.vendorName,
        date: item.nextRenewalDate,
        detail: `${formatCurrency(item.amount, item.currency)} / ${item.billingCycle}`,
      })),
    ...data.tools
      .filter((item) => item.renewalDate)
      .map((item) => ({
        id: item.id,
        name: item.name,
        date: item.renewalDate,
        detail: `${item.paidStatus} / ${item.billingCycle}`,
      })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manual reference view of projects, tools, subscriptions, and relationships.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Projects" value={data.projects.length} detail="Manual records" icon={FolderKanban} href="/projects" />
        <StatCard label="Tools" value={data.tools.length} detail="Tracked services" icon={Wrench} href="/tools" />
        <StatCard label="Active Subs" value={activeSubscriptions.length} detail="Active or trial" icon={CreditCard} href="/subscriptions" />
        <StatCard label="Monthly Cost" value={formatCurrency(subscriptionMonthly + toolMonthly)} detail="Estimated" icon={CalendarClock} href="/subscriptions" />
        <StatCard label="Unknown Paid" value={unknownPaidTools.length} detail="Needs review" icon={AlertCircle} href="/tools" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Upcoming Renewals</h2>
          <div className="mt-4 space-y-3">
            {upcomingRenewals.length ? (
              upcomingRenewals.map((renewal) => (
                <div key={renewal.id} className="flex items-start justify-between gap-4 rounded-md bg-slate-50 px-3 py-2">
                  <div>
                    <p className="font-medium text-slate-900">{renewal.name}</p>
                    <p className="text-sm text-slate-500">{renewal.detail}</p>
                  </div>
                  <p className="text-sm font-medium text-slate-700">{formatDate(renewal.date)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No renewal dates have been entered yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Tools With Unknown Paid Status</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {unknownPaidTools.length ? (
              unknownPaidTools.map((tool) => (
                <span key={tool.id} className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  {tool.name}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-500">All tools have a paid status.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
