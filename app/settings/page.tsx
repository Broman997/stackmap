"use client";

import { Download, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { BACKUP_VERSION } from "@/lib/constants";
import { useStackMapData } from "@/lib/storage";
import type { StackMapData } from "@/lib/types";

type CsvCell = string | number | boolean | undefined;
type StackMapBackup = {
  app: "StackMap";
  version: number;
  exportedAt: string;
  data: StackMapData;
};

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

function isStackMapData(value: unknown): value is StackMapData {
  const candidate = value as StackMapData;
  return Boolean(
    candidate &&
      Array.isArray(candidate.projects) &&
      Array.isArray(candidate.tools) &&
      Array.isArray(candidate.relationships) &&
      Array.isArray(candidate.subscriptions) &&
      Array.isArray(candidate.suggestions) &&
      Array.isArray(candidate.integrationPlans),
  );
}

function getBackupData(value: unknown) {
  const backup = value as Partial<StackMapBackup>;
  if (backup.app === "StackMap" && backup.version === BACKUP_VERSION && isStackMapData(backup.data)) {
    return backup.data;
  }
  if (isStackMapData(value)) {
    return value;
  }
  throw new Error("Backup must be a StackMap full backup or current StackMap data JSON.");
}

export default function SettingsPage() {
  const {
    data,
    resetSampleData,
    importData,
    clearSuggestions,
    resetIntegrationPlans,
  } = useStackMapData();
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportDate = new Date().toISOString().slice(0, 10);

  function exportJson() {
    const backup: StackMapBackup = {
      app: "StackMap",
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data,
    };
    downloadText(
      `stackmap-full-backup-${exportDate}.json`,
      JSON.stringify(backup, null, 2),
      "application/json",
    );
    setMessage("Exported full StackMap backup with version metadata.");
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
      `stackmap-${kind}-${exportDate}.csv`,
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
      `stackmap-all-csv-${exportDate}.txt`,
      sections,
      "text/plain;charset=utf-8",
    );
    setMessage("Exported all CSV sections in one text file.");
  }

  function importJson(text: string) {
    try {
      const parsed = JSON.parse(text);
      const backupData = getBackupData(parsed);
      if (!window.confirm("Importing this backup will replace current local StackMap data. Continue?")) {
        return;
      }
      importData(backupData);
      setImportText("");
      setMessage("Imported StackMap backup into localStorage.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    }
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
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-950">Local Data Health</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Projects", data.projects.length],
              ["Tools", data.tools.length],
              ["Relationships", data.relationships.length],
              ["Subscriptions", data.subscriptions.length],
              ["Suggestions", data.suggestions.length],
              ["Integration Plans", data.integrationPlans.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-slate-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Local Data</h2>
          <p className="mt-2 text-sm text-slate-600">
            Data is stored only in this browser&apos;s localStorage for the MVP.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={exportJson} className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              <Download className="h-4 w-4" aria-hidden="true" />
              Export Full Backup
            </button>
            <button
              onClick={() => {
                if (window.confirm("Reset all local StackMap data to sample data?")) {
                  resetSampleData();
                  setMessage("Sample data reset in localStorage.");
                }
              }}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset Sample Data
            </button>
            <button
              onClick={() => {
                if (window.confirm("Clear all local suggestions? Confirmed projects/tools will remain.")) {
                  clearSuggestions();
                  setMessage("Cleared local suggestions.");
                }
              }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Clear Suggestions
            </button>
            <button
              onClick={() => {
                if (window.confirm("Reset integration plans to the default planned list?")) {
                  resetIntegrationPlans();
                  setMessage("Integration plans reset.");
                }
              }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Reset Integration Plans
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
            <button onClick={exportAllCsv} className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              <Download className="h-4 w-4" aria-hidden="true" />
              All CSV
            </button>
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
              importJson(await file.text());
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <button
            onClick={() => importJson(importText)}
            disabled={!importText.trim()}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Import Pasted Backup
          </button>
        </div>
      </section>

      {message ? (
        <p className="rounded-md border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
          {message}
        </p>
      ) : null}
    </div>
  );
}
