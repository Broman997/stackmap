"use client";

import Link from "next/link";
import { AlertCircle, CalendarClock, CreditCard, Download, FolderKanban, Wrench } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useStackMapData, useStackMapStorageMeta } from "@/lib/storage";
import { formatCurrency, formatDate } from "@/lib/utils";

function monthlyEquivalent(amount: number, cycle: string) {
  const normalized = cycle.toLowerCase();
  if (normalized.includes("annual") || normalized.includes("year")) return amount / 12;
  if (normalized.includes("quarter")) return amount / 3;
  if (normalized.includes("week")) return amount * 4.33;
  if (normalized.includes("one-time") || normalized.includes("none")) return 0;
  return amount;
}

function yearlyEquivalent(monthlyCost: number, annualCost: number) {
  return monthlyCost * 12 + annualCost;
}

function isYearlyCycle(cycle: string) {
  const normalized = cycle.toLowerCase();
  return normalized.includes("annual") || normalized.includes("year");
}

export default function DashboardPage() {
  const { data } = useStackMapData();
  const { storageMeta, backupMeta } = useStackMapStorageMeta();
  const activeSubscriptions = data.subscriptions.filter((item) =>
    ["active", "trial"].includes(item.status),
  );
  const paidTools = data.tools.filter(
    (tool) => tool.status === "active" && (tool.paidStatus === "paid" || tool.paidStatus === "credits"),
  );
  const paidToolIds = new Set(paidTools.map((tool) => tool.id));
  const subscriptionOnlyMonthly = activeSubscriptions
    .filter((subscription) => !paidToolIds.has(subscription.toolId))
    .reduce((sum, item) => sum + monthlyEquivalent(item.amount, item.billingCycle), 0);
  const toolMonthly = paidTools.reduce(
    (sum, tool) => sum + tool.monthlyCost + tool.annualCost / 12,
    0,
  );
  const toolAnnual = paidTools.reduce(
    (sum, tool) => sum + yearlyEquivalent(tool.monthlyCost, tool.annualCost),
    0,
  );
  const monthlyEstimate = toolMonthly + subscriptionOnlyMonthly;
  const annualEstimate = toolAnnual + subscriptionOnlyMonthly * 12;
  const unknownPaidTools = data.tools.filter((tool) => tool.paidStatus === "unknown");
  const monthlyRecurringTools = paidTools
    .filter((tool) => tool.monthlyCost > 0 && !tool.renewalDate)
    .sort((first, second) => second.monthlyCost - first.monthlyCost)
    .slice(0, 6);
  const upcomingRenewals = [
    ...data.tools
      .filter((item) => item.renewalDate && isYearlyCycle(item.billingCycle))
      .map((item) => ({
        id: `tool-${item.id}`,
        name: item.name,
        date: item.renewalDate,
        detail: `${formatCurrency(item.annualCost || item.monthlyCost)} / ${item.billingCycle || item.paidStatus}`,
        href: `/tools/${item.id}`,
      })),
    ...data.subscriptions
      .filter((item) => {
        if (!item.nextRenewalDate || !isYearlyCycle(item.billingCycle)) return false;
        const linkedTool = data.tools.find((tool) => tool.id === item.toolId);
        return !linkedTool?.renewalDate;
      })
      .map((item) => ({
        id: `subscription-${item.id}`,
        name: data.tools.find((tool) => tool.id === item.toolId)?.name ?? item.vendorName,
        date: item.nextRenewalDate,
        detail: `${formatCurrency(item.amount, item.currency)} / ${item.billingCycle}`,
        href: `/subscriptions`,
      })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);
  const hasWorkingData =
    data.projects.length + data.tools.length + data.relationships.length + data.subscriptions.length > 0;
  const isEmptyWorkspace = !hasWorkingData && data.suggestions.length === 0;
  const hasChangesSinceBackup = Boolean(
    storageMeta?.savedAt &&
      backupMeta?.exportedAt &&
      new Date(storageMeta.savedAt).getTime() > new Date(backupMeta.exportedAt).getTime(),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your local overview of projects, tools, costs, renewals, and relationships.
        </p>
      </header>

      {hasWorkingData && (!backupMeta || hasChangesSinceBackup) ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              {backupMeta
                ? "Your StackMap has changes that are not in your latest backup."
                : "Your StackMap data is stored locally in this browser profile. Export a full backup before relying on it long term."}
            </p>
            <Link
              href="/settings"
              className="rounded-md bg-amber-900 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              Backup now
            </Link>
          </div>
        </section>
      ) : null}

      {isEmptyWorkspace ? (
        <section className="rounded-lg border border-indigo-200 bg-indigo-50 p-5">
          <h2 className="text-lg font-semibold text-slate-950">Start a private StackMap</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-700">
            This workspace is empty. Add your own projects and tools, import a backup, or load
            sample data from Settings to explore how the map works.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/projects"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Add projects
            </Link>
            <Link
              href="/tools"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Add tools
            </Link>
            <Link
              href="/settings"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Import or load sample data
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Projects" value={data.projects.length} detail="Manual records" icon={FolderKanban} href="/projects" />
        <StatCard label="Tools" value={data.tools.length} detail="Tracked services" icon={Wrench} href="/tools" />
        <StatCard label="Paid Tools" value={paidTools.length} detail="Active paid tools" icon={CreditCard} href="/tools?status=active&paid=paid" />
        <StatCard
          label="Monthly Est."
          value={formatCurrency(monthlyEstimate)}
          detail={`Annual est. ${formatCurrency(annualEstimate)}`}
          note="Annual costs / 12 + monthly costs."
          icon={CalendarClock}
          href="/tools?status=active&paid=paid&cost=tracked"
        />
        <StatCard label="Unknown Paid" value={unknownPaidTools.length} detail="Needs review" icon={AlertCircle} href="/tools?paid=unknown" />
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-medium text-slate-500">Unknown Paid Tools</h2>
            {unknownPaidTools.length ? (
              <Link href="/tools?paid=unknown" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
                Open
              </Link>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {unknownPaidTools.length ? (
              unknownPaidTools.slice(0, 6).map((tool) => (
                <span key={tool.id} className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                  {tool.name}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-500">All clear</p>
            )}
          </div>
        </section>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Yearly Renewals</h2>
          <div className="mt-4 space-y-3">
            {upcomingRenewals.length ? (
              upcomingRenewals.map((renewal) => (
                <Link key={renewal.id} href={renewal.href} className="flex items-start justify-between gap-4 rounded-md bg-slate-50 px-3 py-2 hover:bg-indigo-50">
                  <div>
                    <p className="font-medium text-slate-900">{renewal.name}</p>
                    <p className="text-sm text-slate-500">{renewal.detail}</p>
                  </div>
                  <p className="text-sm font-medium text-slate-700">{formatDate(renewal.date)}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500">No renewal dates have been entered yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950">Monthly Recurring</h2>
            {monthlyRecurringTools.length ? (
              <Link href="/tools?status=active&paid=paid&cost=tracked" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                Open filtered list
              </Link>
            ) : null}
          </div>
          <div className="mt-4 space-y-3">
            {monthlyRecurringTools.length ? (
              monthlyRecurringTools.map((tool) => (
                <Link key={tool.id} href={`/tools/${tool.id}`} className="flex items-start justify-between gap-4 rounded-md bg-slate-50 px-3 py-2 hover:bg-indigo-50">
                  <div>
                    <p className="font-medium text-slate-900">{tool.name}</p>
                    <p className="text-sm text-slate-500">{tool.billingCycle || "monthly"}</p>
                  </div>
                  <p className="text-sm font-medium text-slate-700">{formatCurrency(tool.monthlyCost)}/mo</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500">No monthly recurring paid tools without renewal dates.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-950">Want to use StackMap on your desktop?</p>
            <p className="mt-1 text-sm text-slate-500">Free Windows app — your data stays local, no account needed.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://github.com/Broman997/stackmap/releases/latest"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download for Windows
            </a>
            <a
              href="https://github.com/Broman997/stackmap/releases/latest"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download for Mac
            </a>
          </div>
        </div>
      </section>

      {process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-700">
          <div className="border-b border-slate-100 pb-5">
            <h2 className="text-lg font-bold text-slate-950">Welcome to StackMap!</h2>
            <p className="mt-2 leading-relaxed">
              StackMap is a free tool built by an indie developer to help track the projects, tools, subscriptions, and AI services that make up your app stack. If you find it useful, the desktop app is completely free and safe to download for both Windows and Mac — just click the button above. Your data never leaves your device and no account is ever required.
            </p>
            <p className="mt-3 leading-relaxed">
              What you are looking at right now is sample data based on real indie apps — <strong>LogIT</strong>, <strong>KeyMatch Pro</strong>, and <strong>Home Inventory Vault</strong>. It is there to give you a feel for how the tool works with actual projects and tools.
            </p>
            <p className="mt-3 leading-relaxed">
              Have a question, idea, or found a bug?{" "}
              <a
                href="https://github.com/Broman997/stackmap/issues"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-indigo-600 underline hover:text-indigo-800"
              >
                Open an issue on GitHub
              </a>{" "}
              — all feedback is welcome.
            </p>
          </div>

          <div className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Get started in 3 steps</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">1. Explore the demo</p>
                <p className="mt-1 text-slate-600">Browse the projects, tools, relationships, and visual map to see how everything connects.</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">2. Clear the sample data</p>
                <p className="mt-1 text-slate-600">Go to <strong>Settings</strong> and choose <strong>Clear Projects Only</strong> to keep the tool library, or <strong>Clear All Data</strong> to start completely fresh.</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">3. Add your own projects</p>
                <p className="mt-1 text-slate-600">Head to <strong>Projects</strong> or <strong>Tools</strong> in the sidebar and start building your own private stack map.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Web or Desktop?</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">Web version (this site) — easiest to get started</p>
                <p className="mt-1 leading-relaxed text-slate-600">No download needed. Your data is saved privately in your browser and never sent anywhere. The only thing to keep in mind is that your data is tied to this browser — if you clear your browser history or switch browsers it won't carry over. Export a backup from Settings occasionally to keep a copy safe.</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">Desktop version — best for long-term use</p>
                <p className="mt-1 leading-relaxed text-slate-600">Downloads as a Windows (.exe) or Mac (.dmg) installer. Your data is stored on your computer rather than in a browser, so it is more permanent. Windows users may see a security warning — click the arrow next to the blocked file and choose <strong>Keep</strong> to continue. This is normal for new apps and safe to proceed.</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">Clearing the sample data</p>
              <p className="mt-1 leading-relaxed text-slate-600">Go to <strong>Settings</strong> and choose <strong>Clear Projects Only</strong> to remove the sample projects but keep the full tool library — so you don't have to re-add common tools like GitHub, Vercel, or Claude. Only choose <strong>Clear All Data</strong> if you want to start completely from scratch.</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">Backing up your data</p>
              <p className="mt-1 leading-relaxed text-slate-600">Whether you use the web or desktop version, go to <strong>Settings</strong> and export a full backup every so often. This saves a JSON file you can import back into any version of StackMap at any time.</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
