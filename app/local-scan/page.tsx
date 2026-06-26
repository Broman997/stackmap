"use client";

import Link from "next/link";
import { FolderSearch, ListChecks, ScanLine } from "lucide-react";
import { useRef, useState } from "react";
import { scanLocalProject, type LocalScanFile, type LocalScanResult } from "@/lib/localScanner";
import { useStackMapData } from "@/lib/storage";

const maxFileSize = 300_000;

function getFilePath(file: File) {
  return file.webkitRelativePath || file.name;
}

function isSafeMetadataFile(path: string) {
  const normalized = path.replaceAll("\\", "/");
  const fileName = normalized.split("/").pop() ?? normalized;
  return (
    [
      ".firebaserc",
      ".gitignore",
      "README.md",
      "readme.md",
      "package.json",
      "app.json",
      "app.config.js",
      "app.config.ts",
      "app.config.mjs",
      "app.config.cjs",
      "next.config.js",
      "next.config.mjs",
      "next.config.ts",
      "vercel.json",
      "eas.json",
      "firebase.json",
      "netlify.toml",
      "tailwind.config.js",
      "tailwind.config.ts",
      "vite.config.js",
      "vite.config.ts",
      "wrangler.toml",
    ].includes(fileName) || normalized.endsWith("supabase/config.toml")
  );
}

export default function LocalScanPage() {
  const { data, addSuggestion } = useStackMapData();
  const [result, setResult] = useState<LocalScanResult | null>(null);
  const [message, setMessage] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [supportedCount, setSupportedCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCount = data.suggestions.filter((suggestion) => suggestion.status === "pending").length;

  async function scanFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setIsScanning(true);
    setMessage("");

    try {
      const allSelectedFiles = Array.from(fileList);
      const selectedFiles = allSelectedFiles.filter((file) => {
        const path = getFilePath(file);
        return isSafeMetadataFile(path) && file.size <= maxFileSize;
      });
      setSelectedCount(allSelectedFiles.length);
      setSupportedCount(selectedFiles.length);

      const files: LocalScanFile[] = await Promise.all(
        selectedFiles.map(async (file) => ({
          path: getFilePath(file),
          name: file.name,
          text: await file.text(),
        })),
      );

      const selectedPaths = allSelectedFiles.map((file) => getFilePath(file));
      const nextResult = scanLocalProject(files, data, selectedPaths);
      setResult(nextResult);
      setMessage(
        selectedFiles.length
          ? `Scanned ${nextResult.scannedFiles.length} metadata file${nextResult.scannedFiles.length === 1 ? "" : "s"} from ${nextResult.rootName}.`
          : `Selected ${allSelectedFiles.length} file${allSelectedFiles.length === 1 ? "" : "s"}, but none were supported metadata files.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Local scan failed.");
    } finally {
      setIsScanning(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function saveSuggestions() {
    if (!result) return;
    result.suggestions.forEach((suggestion) => addSuggestion(suggestion));
    setMessage(
      `Saved ${result.suggestions.length} suggestion${result.suggestions.length === 1 ? "" : "s"} to the review queue.`,
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Local Project Scan</h1>
        <p className="mt-1 text-sm text-slate-600">
          Choose one local project folder. StackMap reads safe metadata files in your browser and creates suggestions only.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Select A Folder</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              This scans files like package.json, app config, vercel.json, eas.json, firebase.json,
              and supabase/config.toml. It does not read .env files, secrets, source files, or sibling folders.
            </p>
          </div>
          <Link
            href="/suggestions"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            Review Queue ({pendingCount})
          </Link>
        </div>

        <label className="mt-4 flex max-w-2xl cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-600 hover:bg-slate-50">
          <FolderSearch className="h-5 w-5 text-slate-400" aria-hidden="true" />
          <span>{isScanning ? "Scanning selected folder..." : "Choose one project folder"}</span>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            {...{ webkitdirectory: "", directory: "" }}
            onChange={(event) => void scanFiles(event.target.files)}
          />
        </label>
      </section>

      {result ? (
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-950">Scan Results</h2>
            <p className="text-sm text-slate-500">
              {result.suggestions.length} new suggestion
              {result.suggestions.length === 1 ? "" : "s"} and {result.skipped.length} skipped item
              {result.skipped.length === 1 ? "" : "s"}.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Selected {selectedCount} file{selectedCount === 1 ? "" : "s"}; found{" "}
              {supportedCount} supported metadata file{supportedCount === 1 ? "" : "s"}.
            </p>
          </div>

          <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-3">
              {result.suggestions.map((suggestion, index) => (
                <article key={`${suggestion.entityType}-${index}`} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold uppercase text-slate-600">
                      {suggestion.entityType}
                    </span>
                    <span className="rounded-md bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-800">
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                    <p className="font-medium text-slate-950">
                      {String(suggestion.detectedFields.name ?? suggestion.detectedFields.toName ?? "Unnamed")}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{suggestion.notes}</p>
                </article>
              ))}
              {result.suggestions.length === 0 ? (
                <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">
                  No new suggestions found. If this was unexpected, choose the inner project folder
                  that contains package.json or app config files.
                </p>
              ) : null}
            </div>

            <aside className="space-y-4">
              <button
                type="button"
                onClick={saveSuggestions}
                disabled={result.suggestions.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <ScanLine className="h-4 w-4" aria-hidden="true" />
                Save Suggestions
              </button>

              <div className="rounded-md bg-slate-50 p-3">
                <h3 className="text-sm font-semibold text-slate-900">Files Read</h3>
                <div className="mt-2 max-h-52 space-y-1 overflow-y-auto text-xs text-slate-600">
                  {result.scannedFiles.map((file) => (
                    <p key={file} className="break-all font-mono">
                      {file}
                    </p>
                  ))}
                  {result.scannedFiles.length === 0 ? <p>No supported metadata files found.</p> : null}
                </div>
              </div>

              <div className="rounded-md bg-slate-50 p-3">
                <h3 className="text-sm font-semibold text-slate-900">Ignored Files</h3>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-600">
                  {result.ignoredFiles.slice(0, 80).map((file) => (
                    <p key={file} className="break-all font-mono">
                      {file}
                    </p>
                  ))}
                  {result.ignoredFiles.length > 80 ? (
                    <p>{result.ignoredFiles.length - 80} more ignored file(s).</p>
                  ) : null}
                  {result.ignoredFiles.length === 0 ? <p>No ignored files.</p> : null}
                </div>
              </div>

              <div className="rounded-md bg-amber-50 p-3">
                <h3 className="text-sm font-semibold text-amber-900">Skipped</h3>
                <div className="mt-2 max-h-52 space-y-2 overflow-y-auto text-xs text-amber-900">
                  {result.skipped.map((item, index) => (
                    <p key={`${item.label}-${index}`}>
                      <span className="font-medium">{item.label}:</span> {item.reason}
                    </p>
                  ))}
                  {result.skipped.length === 0 ? <p>Nothing skipped.</p> : null}
                </div>
              </div>
            </aside>
          </div>
        </section>
      ) : null}

      {message ? (
        <p className="rounded-md border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
          {message}
        </p>
      ) : null}
    </div>
  );
}
