"use client";

import Link from "next/link";
import { ClipboardList, FileJson, Wand2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type {
  ProjectType,
  Suggestion,
  SuggestionFieldValue,
  ToolCategory,
} from "@/lib/types";
import { useStackMapData } from "@/lib/storage";

type SuggestionKind = "project" | "tool";

type ParsedSuggestion = {
  kind: SuggestionKind;
  name: string;
  classification: ProjectType | ToolCategory;
  notes: string;
  duplicate: boolean;
};

type SuggestionImportFile = {
  app?: string;
  kind?: string;
  source?: string;
  suggestions?: Array<
    Omit<Suggestion, "id" | "createdAt" | "updatedAt"> & {
      detectedFields: Record<string, SuggestionFieldValue>;
    }
  >;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];
    if (character === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells.map((cell) => cell.replace(/^"|"$/g, ""));
}

function inferKind(text: string): SuggestionKind {
  const lower = text.toLowerCase();
  if (
    lower.includes("app") ||
    lower.includes("website") ||
    lower.includes("backend") ||
    lower.includes("project")
  ) {
    return "project";
  }
  return "tool";
}

function inferProjectType(text: string): ProjectType {
  const lower = text.toLowerCase();
  if (lower.includes("ios")) return "iOS app";
  if (lower.includes("android")) return "Android app";
  if (lower.includes("website") || lower.includes("site")) return "website";
  if (lower.includes("backend") || lower.includes("api")) return "backend";
  if (lower.includes("marketing")) return "marketing";
  return "other";
}

function inferToolCategory(text: string): ToolCategory {
  const lower = text.toLowerCase();
  if (lower.includes("ai") || lower.includes("openai") || lower.includes("moondream")) return "AI";
  if (lower.includes("github") || lower.includes("code") || lower.includes("repo")) return "code";
  if (lower.includes("database") || lower.includes("supabase")) return "database";
  if (lower.includes("hosting") || lower.includes("vercel")) return "hosting";
  if (lower.includes("apple") || lower.includes("google play") || lower.includes("store")) return "app store";
  if (lower.includes("analytics")) return "analytics";
  if (lower.includes("canva") || lower.includes("design")) return "design";
  if (lower.includes("tiktok") || lower.includes("marketing")) return "marketing";
  if (lower.includes("domain")) return "domain";
  if (lower.includes("stripe") || lower.includes("payment")) return "payment";
  return "other";
}

function parseSuggestions(
  text: string,
  projectNames: Set<string>,
  toolNames: Set<string>,
): ParsedSuggestion[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = splitCsvLine(line);
      const joined = cells.join(" ");
      const first = cells[0] ?? line;
      const explicitKind = normalize(cells[1] ?? "");
      const kind: SuggestionKind =
        explicitKind === "project" || explicitKind === "tool"
          ? explicitKind
          : inferKind(joined);
      const classification =
        kind === "project" ? inferProjectType(joined) : inferToolCategory(joined);
      const normalizedName = normalize(first);
      return {
        kind,
        name: first,
        classification,
        notes: cells.slice(2).join(" ").trim() || "Imported from pasted suggestion text.",
        duplicate:
          kind === "project"
            ? projectNames.has(normalizedName)
            : toolNames.has(normalizedName),
      };
    })
    .filter((suggestion) => suggestion.name.length > 0);
}

export default function ImportPage() {
  const { data, addSuggestion } = useStackMapData();
  const [sourceText, setSourceText] = useState("");
  const [lastParsed, setLastParsed] = useState<ParsedSuggestion[]>([]);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectNames = useMemo(
    () => new Set(data.projects.map((project) => normalize(project.name))),
    [data.projects],
  );
  const toolNames = useMemo(
    () => new Set(data.tools.map((tool) => normalize(tool.name))),
    [data.tools],
  );
  const pendingCount = data.suggestions.filter((item) => item.status === "pending").length;

  function stageSuggestions() {
    const parsed = parseSuggestions(sourceText, projectNames, toolNames);
    parsed.forEach((suggestion) => {
      addSuggestion({
        source: "manual_import",
        entityType: suggestion.kind,
        confidence: suggestion.duplicate ? 0.45 : 0.75,
        detectedFields:
          suggestion.kind === "project"
            ? {
                name: suggestion.name,
                type: suggestion.classification,
                status: "active",
                notes: suggestion.notes,
              }
            : {
                name: suggestion.name,
                category: suggestion.classification,
                paidStatus: "unknown",
                status: "unknown",
                notes: suggestion.notes,
              },
        notes: suggestion.duplicate
          ? `${suggestion.notes} Possible duplicate by name.`
          : suggestion.notes,
      });
    });
    setLastParsed(parsed);
    setMessage(
      `Saved ${parsed.length} suggestion${parsed.length === 1 ? "" : "s"} to the local suggestion queue.`,
    );
  }

  async function importSuggestionFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as SuggestionImportFile;
      if (
        parsed.app !== "StackMap" ||
        parsed.kind !== "suggestion-import" ||
        !Array.isArray(parsed.suggestions)
      ) {
        throw new Error("Choose a StackMap suggestion-import JSON file.");
      }

      parsed.suggestions.forEach((suggestion) => {
        addSuggestion({
          source: suggestion.source,
          entityType: suggestion.entityType,
          status: suggestion.status,
          confidence: suggestion.confidence,
          detectedFields: suggestion.detectedFields,
          notes: suggestion.notes,
        });
      });
      setMessage(
        `Imported ${parsed.suggestions.length} suggestion${parsed.suggestions.length === 1 ? "" : "s"} from ${file.name}.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Suggestion import failed.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Import Suggestions</h1>
        <p className="mt-1 text-sm text-slate-600">
          Paste local text or CSV-like rows. StackMap saves suggestions for manual review only.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Paste Source Text</h2>
        <p className="mt-2 text-sm text-slate-600">
          One item per line works best. Optional format: name, project/tool, notes.
        </p>
        <textarea
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
          rows={8}
          className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={"Example:\nNew Website, project, marketing site\nFigma, tool, design tool\nInternal API, project, backend"}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={stageSuggestions}
            disabled={!sourceText.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Wand2 className="h-4 w-4" aria-hidden="true" />
            Save to Suggestions
          </button>
          <Link
            href="/suggestions"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            Review Queue ({pendingCount})
          </Link>
          <button
            type="button"
            onClick={() => {
              setSourceText("");
              setLastParsed([]);
              setMessage("");
            }}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Clear
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Import Suggestion JSON</h2>
        <p className="mt-2 text-sm text-slate-600">
          Use this for generated files like <span className="font-mono">generated/github-suggestions.json</span>.
          Imported rows still go to Suggestions for manual approval.
        </p>
        <label className="mt-4 flex max-w-xl cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-600 hover:bg-slate-50">
          <FileJson className="h-5 w-5 text-slate-400" aria-hidden="true" />
          <span>Choose StackMap suggestion JSON</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importSuggestionFile(file);
            }}
          />
        </label>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-950">Last Parsed Batch</h2>
          <p className="text-sm text-slate-500">
            These were saved as pending suggestions, not confirmed records.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {lastParsed.map((suggestion, index) => (
            <article key={`${suggestion.name}-${index}`} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold uppercase text-slate-600">
                  {suggestion.kind}
                </span>
                <p className="font-medium text-slate-950">{suggestion.name}</p>
                <span className="text-sm text-slate-500">{suggestion.classification}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{suggestion.notes}</p>
              {suggestion.duplicate ? (
                <p className="mt-2 text-sm font-medium text-amber-700">
                  Possible duplicate by name.
                </p>
              ) : null}
            </article>
          ))}
          {lastParsed.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              No suggestions parsed in this session yet.
            </p>
          ) : null}
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
