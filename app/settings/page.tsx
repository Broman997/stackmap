"use client";

import { Download, RotateCcw, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { BACKUP_VERSION } from "@/lib/constants";
import { resetNavOrder } from "@/lib/navigation";
import { useStackMapData, useStackMapStorageMeta, writeBackupMeta } from "@/lib/storage";
import type { StackMapData } from "@/lib/types";

type CsvCell = string | number | boolean | undefined;
type StackMapBackup = {
  app: "StackMap";
  version: number;
  exportedAt: string;
  source: {
    storage: "browser-localStorage";
    origin: string;
  };
  data: StackMapData;
};
type ImportPreview = {
  data: StackMapData;
  exportedAt?: string;
  filename?: string;
  source: "file" | "pasted";
};

const advancedLinks = [
  {
    href: "/import",
    label: "Import Suggestions",
    description: "Stage pasted or JSON suggestion data for manual approval.",
  },
  {
    href: "/suggestions",
    label: "Suggestions",
    description: "Review staged records before they become confirmed StackMap data.",
  },
];

function csvEscape(value: CsvCell) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function toCsv(headers: string[], rows: CsvCell[][]) {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ].join("\r\n");
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatDateTime(value: string | undefined) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function filenameTimestamp(value = new Date()) {
  return value.toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
}

function isStackMapData(value: unknown): value is StackMapData {
  const candidate = value as StackMapData;
  return Boolean(
    candidate &&
      Array.isArray(candidate.projects) &&
      Array.isArray(candidate.tools) &&
      Array.isArray(candidate.relationships) &&
      Array.isArray(candidate.subscriptions) &&
      Array.isArray(candidate.suggestions),
  );
}

function getBackupPreviewData(value: unknown) {
  const backup = value as Partial<StackMapBackup>;
  if (backup.app === "StackMap" && backup.version === BACKUP_VERSION && isStackMapData(backup.data)) {
    return {
      data: backup.data,
      exportedAt: backup.exportedAt,
    };
  }
  if (isStackMapData(value)) {
    return { data: value };
  }
  throw new Error("Backup must be a StackMap full backup or current StackMap data JSON.");
}

function countRecords(data: StackMapData) {
  return {
    projects: data.projects.length,
    tools: data.tools.length,
    relationships: data.relationships.length,
    subscriptions: data.subscriptions.length,
    suggestions: data.suggestions.length,
  };
}

export default function SettingsPage() {
  const {
    data,
    resetSampleData,
    clearAllData,
    clearProjectsAndRelationships,
    importData,
    clearSuggestions,
  } = useStackMapData();
  const { storageMeta, backupMeta, refreshStorageMeta } = useStackMapStorageMeta();
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasWorkingData =
    data.projects.length + data.tools.length + data.relationships.length + data.subscriptions.length > 0;
  const hasChangesSinceBackup = Boolean(
    storageMeta?.savedAt &&
      backupMeta?.exportedAt &&
      new Date(storageMeta.savedAt).getTime() > new Date(backupMeta.exportedAt).getTime(),
  );

  function exportJson() {
    const exportedDate = new Date();
    const exportedAt = exportedDate.toISOString();
    const filename = `stackmap-full-backup-${filenameTimestamp(exportedDate)}.json`;
    const backup: StackMapBackup = {
      app: "StackMap",
      version: BACKUP_VERSION,
      exportedAt,
      source: {
        storage: "browser-localStorage",
        origin: window.location.origin,
      },
      data,
    };
    downloadText(
      filename,
      JSON.stringify(backup, null, 2),
      "application/json",
    );
    writeBackupMeta({
      exportedAt,
      filename,
      origin: window.location.origin,
      counts: {
        projects: data.projects.length,
        tools: data.tools.length,
        relationships: data.relationships.length,
        subscriptions: data.subscriptions.length,
      },
    });
    refreshStorageMeta();
    setMessage(`Exported full StackMap backup: ${filename}`);
  }

  function csvFiles() {
    return {
      projects: toCsv(
        [
          "id",
          "name",
          "type",
          "status",
          "notes",
          "lastReviewedAt",
          "createdAt",
          "updatedAt",
        ],
        data.projects.map((project) => [
          project.id,
          project.name,
          project.type,
          project.status,
          project.notes,
          project.lastReviewedAt,
          project.createdAt,
          project.updatedAt,
        ]),
      ),
      tools: toCsv(
        [
          "id",
          "name",
          "category",
          "websiteUrl",
          "loginUrl",
          "accountEmail",
          "paidStatus",
          "monthlyCost",
          "annualCost",
          "billingCycle",
          "renewalDate",
          "status",
          "notes",
          "lastReviewedAt",
          "createdAt",
          "updatedAt",
        ],
        data.tools.map((tool) => [
          tool.id,
          tool.name,
          tool.category,
          tool.websiteUrl,
          tool.loginUrl,
          tool.accountEmail,
          tool.paidStatus,
          tool.monthlyCost,
          tool.annualCost,
          tool.billingCycle,
          tool.renewalDate,
          tool.status,
          tool.notes,
          tool.lastReviewedAt,
          tool.createdAt,
          tool.updatedAt,
        ]),
      ),
      subscriptions: toCsv(
        [
          "id",
          "toolId",
          "vendorName",
          "amount",
          "currency",
          "billingCycle",
          "nextRenewalDate",
          "paymentMethod",
          "status",
          "notes",
          "createdAt",
          "updatedAt",
        ],
        data.subscriptions.map((subscription) => [
          subscription.id,
          subscription.toolId,
          subscription.vendorName,
          subscription.amount,
          subscription.currency,
          subscription.billingCycle,
          subscription.nextRenewalDate,
          subscription.paymentMethod,
          subscription.status,
          subscription.notes,
          subscription.createdAt,
          subscription.updatedAt,
        ]),
      ),
      relationships: toCsv(
        [
          "id",
          "fromType",
          "fromId",
          "toType",
          "toId",
          "relationshipType",
          "notes",
          "createdAt",
          "updatedAt",
        ],
        data.relationships.map((relationship) => [
          relationship.id,
          relationship.fromType,
          relationship.fromId,
          relationship.toType,
          relationship.toId,
          relationship.relationshipType,
          relationship.notes,
          relationship.createdAt,
          relationship.updatedAt,
        ]),
      ),
    };
  }

  function exportCsv(kind: keyof ReturnType<typeof csvFiles>) {
    const files = csvFiles();
    downloadText(
      `stackmap-${kind}-${filenameTimestamp()}.csv`,
      files[kind],
      "text/csv;charset=utf-8",
    );
    setMessage(`Exported ${kind} CSV from local StackMap data.`);
  }

  function exportAllCsv() {
    const files = csvFiles();
    const sections = Object.entries(files)
      .map(([name, content]) => `# ${name}\r\n${content}`)
      .join("\r\n\r\n");
    downloadText(
      `stackmap-all-csv-${filenameTimestamp()}.txt`,
      sections,
      "text/plain;charset=utf-8",
    );
    setMessage("Exported all CSV sections in one text file.");
  }

  function previewImport(text: string, source: ImportPreview["source"], filename?: string) {
    try {
      const parsed = JSON.parse(text);
      const backupData = getBackupPreviewData(parsed);
      setImportPreview({
        ...backupData,
        filename,
        source,
      });
      setMessage("Backup parsed. Review the import preview before replacing local data.");
    } catch (error) {
      setImportPreview(null);
      setMessage(error instanceof Error ? error.message : "Backup preview failed.");
    }
  }

  function confirmImport() {
    if (!importPreview) return;
    if (!confirmRiskyLocalChange("Replace current local StackMap data with this backup?")) return;

    importData(importPreview.data);
    setImportText("");
    setImportPreview(null);
    refreshStorageMeta();
    setMessage("Imported StackMap backup into localStorage.");
  }

  const currentCounts = countRecords(data);
  const importCounts = importPreview ? countRecords(importPreview.data) : null;

  function confirmRiskyLocalChange(action: string) {
    if (!hasWorkingData || (backupMeta && !hasChangesSinceBackup)) {
      return window.confirm(action);
    }

    const backupWarning = backupMeta
      ? "Your local data has changed since the last full backup."
      : "No full backup has been recorded for this local data.";

    return window.confirm(`${backupWarning}\n\n${action}\n\nContinue without exporting a new full backup?`);
  }

  function restoreDefaultNavOrder() {
    resetNavOrder();
    setMessage("Reset sidebar menu order.");
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage local data health, full backups, CSV export, and JSON import.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-950">Local-first storage</h2>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <p>
              StackMap data is saved in this browser profile on this device. It is not uploaded to
              a StackMap server.
            </p>
            <p>
              Tabs and windows in this same browser profile stay in sync. Other browsers,
              profiles, and computers need a backup import.
            </p>
            <p>
              Export a full backup before major changes, browser cleanup, or moving data to
              another device.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-950">Local Data Health</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-8">
            {[
              ["Projects", data.projects.length],
              ["Tools", data.tools.length],
              ["Relationships", data.relationships.length],
              ["Subscriptions", data.subscriptions.length],
              ["Suggestions", data.suggestions.length],
              ["Auto-save", "On"],
              ["Recovery Copy", "On"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Last Local Save
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {formatDateTime(storageMeta?.savedAt)}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Last Full Backup
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {formatDateTime(backupMeta?.exportedAt)}
              </p>
              {backupMeta?.filename ? (
                <p className="mt-1 truncate text-xs text-slate-500">{backupMeta.filename}</p>
              ) : null}
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Storage Scope
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                This browser profile only
              </p>
            </div>
          </div>
          {hasWorkingData && (!backupMeta || hasChangesSinceBackup) ? (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {backupMeta
                ? "Your local data has changed since the last full backup. Export a new backup before major changes."
                : "No full backup has been recorded in this browser. Export a backup so your StackMap work is not only stored in local browser data."}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Local Data</h2>
          <p className="mt-2 text-sm text-slate-600">
            Data is saved after each change in this browser&apos;s localStorage, with a same-browser recovery copy.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={exportJson} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Download className="h-4 w-4" aria-hidden="true" />
              Export Full Backup
            </button>
            <button
              onClick={() => {
                if (confirmRiskyLocalChange("Replace current local StackMap data with sample/demo data?")) {
                  resetSampleData();
                  refreshStorageMeta();
                  setMessage("Loaded sample data into localStorage.");
                }
              }}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Load Sample Data
            </button>
            <button
              onClick={() => {
                if (confirmRiskyLocalChange("Clear projects, relationships, and subscriptions — but keep your tool library?")) {
                  clearProjectsAndRelationships();
                  refreshStorageMeta();
                  setMessage("Cleared projects and relationships. Tool library kept.");
                }
              }}
              className="inline-flex items-center gap-2 rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Clear Projects Only
            </button>
            <button
              onClick={() => {
                if (
                  confirmRiskyLocalChange(
                    "Clear all local StackMap data in this browser profile?",
                  )
                ) {
                  clearAllData();
                  refreshStorageMeta();
                  setMessage("Cleared all local StackMap data in this browser profile.");
                }
              }}
              className="inline-flex items-center gap-2 rounded-md border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Clear All Data
            </button>
            <button
              onClick={() => {
                if (confirmRiskyLocalChange("Clear all local suggestions? Confirmed projects/tools will remain.")) {
                  clearSuggestions();
                  setMessage("Cleared local suggestions.");
                }
              }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Clear Suggestions
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">CSV Export</h2>
          <p className="mt-2 text-sm text-slate-600">
            Download local records as CSV for spreadsheets or backups.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => exportCsv("projects")} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Projects CSV
            </button>
            <button onClick={() => exportCsv("tools")} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Tools CSV
            </button>
            <button onClick={() => exportCsv("subscriptions")} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Subscriptions CSV
            </button>
            <button onClick={() => exportCsv("relationships")} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Relationships CSV
            </button>
            <button onClick={exportAllCsv} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Download className="h-4 w-4" aria-hidden="true" />
              All CSV
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Sidebar Menu Order</h2>
              <p className="mt-2 text-sm text-slate-600">
                Drag menu items directly in the left sidebar to reorder them.
              </p>
            </div>
            <button
              type="button"
              onClick={restoreDefaultNavOrder}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Reset order
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-950">Advanced</h2>
          <p className="mt-2 text-sm text-slate-600">
            These pages are available for staged manual imports, but they are not part of the
            daily sidebar.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {advancedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 hover:border-indigo-300 hover:bg-indigo-50"
              >
                <span className="block text-sm font-semibold text-slate-950">{link.label}</span>
                <span className="mt-1 block text-xs text-slate-600">{link.description}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Import Full Backup</h2>
          <p className="mt-2 text-sm text-slate-600">
            Paste a StackMap full backup or choose a local JSON backup file.
          </p>
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={8}
            className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder='{"app":"StackMap","version":1,"exportedAt":"...","data":{...}}'
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="mt-3 block w-full text-sm text-slate-600"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              previewImport(await file.text(), "file", file.name);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <button
            onClick={() => previewImport(importText, "pasted")}
            disabled={!importText.trim()}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Preview Pasted Backup
          </button>
          {importPreview && importCounts ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">Import Preview</h3>
                  <p className="mt-1 text-sm text-amber-900">
                    This backup will replace current local data in this browser profile.
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    Source: {importPreview.filename ?? importPreview.source}
                    {importPreview.exportedAt
                      ? ` / Exported ${formatDateTime(importPreview.exportedAt)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={confirmImport}
                    className="rounded-md bg-amber-900 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800"
                  >
                    Replace Local Data
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportPreview(null)}
                    className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-5">
                {(["projects", "tools", "relationships", "subscriptions", "suggestions"] as const).map(
                  (key) => (
                    <div key={key} className="rounded-md bg-white px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {key}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {currentCounts[key]} -&gt; {importCounts[key]}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {message ? (
        <p className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}
