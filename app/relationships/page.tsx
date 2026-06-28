"use client";

import { Plus, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { EntityTable, type TableColumn } from "@/components/EntityTable";
import { RelationshipForm } from "@/components/RelationshipForm";
import { useStackMapData } from "@/lib/storage";
import type { EntityType, Relationship, RelationshipType, StackMapData } from "@/lib/types";
import { getEntityName, getRelationshipLabel } from "@/lib/utils";

type RelationshipTemplateItem = {
  group: string;
  toolName: string;
  matchToolNames?: string[];
  relationshipType: RelationshipType;
  notes: string;
};

type RelationshipTemplateGroup = {
  name: string;
  items: Omit<RelationshipTemplateItem, "group">[];
};

const relationshipTemplateGroups: RelationshipTemplateGroup[] = [
  {
    name: "Development",
    items: [
      {
        toolName: "Visual Studio / VS Code",
        matchToolNames: ["Visual Studio", "VS Code"],
        relationshipType: "uses",
        notes: "Local development environment.",
      },
      { toolName: "GitHub", relationshipType: "uses", notes: "Source code repository." },
      { toolName: "Codex", relationshipType: "assists_with", notes: "AI coding assistant used during development." },
      { toolName: "Claude", relationshipType: "assists_with", notes: "AI assistant used during planning or development." },
      { toolName: "ChatGPT", relationshipType: "uses", notes: "Planning, product thinking, and troubleshooting support." },
    ],
  },
  {
    name: "Hosting / Deployment",
    items: [
      { toolName: "Vercel", relationshipType: "deploys_to", notes: "Web hosting or deployment target." },
      { toolName: "Expo.dev", relationshipType: "deploys_to", notes: "Mobile build/deployment workflow." },
    ],
  },
  {
    name: "Data / Backend",
    items: [
      { toolName: "Supabase", relationshipType: "stores_data_in", notes: "Backend database/storage dependency." },
      { toolName: "OpenAI", relationshipType: "integrates_with", notes: "AI platform integration. Do not store API keys in StackMap." },
      { toolName: "IMDB", relationshipType: "depends_on", notes: "External reference/data dependency." },
      { toolName: "Airtable", relationshipType: "stores_data_in", notes: "Workspace data or operational database." },
    ],
  },
  {
    name: "Mobile Publishing",
    items: [
      { toolName: "Apple Developer", relationshipType: "publishes_to", notes: "iOS publishing account." },
      { toolName: "Google Play Console", relationshipType: "publishes_to", notes: "Android publishing account." },
      { toolName: "RevenueCat", relationshipType: "integrates_with", notes: "Subscription and in-app purchase management." },
      { toolName: "Google AdMob", relationshipType: "integrates_with", notes: "Ads and monetization workflow." },
    ],
  },
  {
    name: "Marketing / Design",
    items: [
      { toolName: "TikTok", relationshipType: "markets_through", notes: "Marketing channel." },
      { toolName: "Canva", relationshipType: "uses", notes: "Design or marketing asset creation." },
    ],
  },
];

const relationshipTemplateItems: RelationshipTemplateItem[] = relationshipTemplateGroups.flatMap(
  (group) => group.items.map((item) => ({ ...item, group: group.name })),
);

const toolCategoryDefaults: Record<
  StackMapData["tools"][number]["category"],
  Pick<RelationshipTemplateItem, "group" | "relationshipType" | "notes">
> = {
  AI: {
    group: "Development",
    relationshipType: "assists_with",
    notes: "AI assistant or platform used while building or running this project.",
  },
  code: {
    group: "Development",
    relationshipType: "uses",
    notes: "Development, source control, or code workflow tool.",
  },
  database: {
    group: "Data / Backend",
    relationshipType: "stores_data_in",
    notes: "Database, storage, or reference data dependency.",
  },
  hosting: {
    group: "Hosting / Deployment",
    relationshipType: "deploys_to",
    notes: "Hosting, build, or deployment target.",
  },
  "app store": {
    group: "Mobile Publishing",
    relationshipType: "publishes_to",
    notes: "Publishing account or app store destination.",
  },
  analytics: {
    group: "Marketing / Design",
    relationshipType: "integrates_with",
    notes: "Analytics or measurement integration.",
  },
  design: {
    group: "Marketing / Design",
    relationshipType: "uses",
    notes: "Design or creative asset tool.",
  },
  marketing: {
    group: "Marketing / Design",
    relationshipType: "markets_through",
    notes: "Marketing, ads, or audience channel.",
  },
  domain: {
    group: "Hosting / Deployment",
    relationshipType: "depends_on",
    notes: "Domain, DNS, or web infrastructure dependency.",
  },
  payment: {
    group: "Mobile Publishing",
    relationshipType: "integrates_with",
    notes: "Payment, subscription, or purchase management integration.",
  },
  other: {
    group: "Other",
    relationshipType: "uses",
    notes: "Custom tool used by this project.",
  },
};

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function templateToolNameSet() {
  return new Set(
    relationshipTemplateItems.flatMap((item) => item.matchToolNames ?? [item.toolName]).map(normalizeName),
  );
}

function getRelationshipBuilderGroups(data: StackMapData): RelationshipTemplateGroup[] {
  const knownTemplateNames = templateToolNameSet();
  const groups = new Map<string, RelationshipTemplateGroup["items"]>(
    relationshipTemplateGroups.map((group) => [group.name, [...group.items]]),
  );

  data.tools
    .filter((tool) => !knownTemplateNames.has(normalizeName(tool.name)))
    .sort((first, second) => first.name.localeCompare(second.name))
    .forEach((tool) => {
      const defaults = toolCategoryDefaults[tool.category];
      const items = groups.get(defaults.group) ?? [];
      groups.set(defaults.group, [
        ...items,
        {
          toolName: tool.name,
          relationshipType: defaults.relationshipType,
          notes: defaults.notes,
        },
      ]);
    });

  return [...groups.entries()].map(([name, items]) => ({ name, items }));
}

function relationshipExists(
  data: StackMapData,
  projectId: string,
  toolId: string,
  relationshipType: RelationshipType,
) {
  return data.relationships.some(
    (relationship) =>
      relationship.fromType === "project" &&
      relationship.fromId === projectId &&
      relationship.toType === "tool" &&
      relationship.toId === toolId &&
      relationship.relationshipType === relationshipType,
  );
}

function findTemplateTool(
  toolsByName: Map<string, StackMapData["tools"][number]>,
  templateItem: RelationshipTemplateItem,
) {
  const names = templateItem.matchToolNames ?? [templateItem.toolName];
  return names.map((name) => toolsByName.get(normalizeName(name))).find(Boolean);
}

export default function RelationshipsPage() {
  const { data, addRelationship, updateRelationship, deleteRelationship } = useStackMapData();
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<Relationship | null>(null);

  function startEditing(relationship: Relationship) {
    setEditing(relationship);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const [defaultFrom, setDefaultFrom] = useState<{ type: EntityType; id: string } | undefined>();
  const [templateProjectId, setTemplateProjectId] = useState("");
  const [selectedTemplateKeys, setSelectedTemplateKeys] = useState<string[]>([]);
  const [templateMessage, setTemplateMessage] = useState("");
  const selectedTemplateProjectId = templateProjectId || data.projects[0]?.id || "";
  const selectedTemplateKeySet = new Set(selectedTemplateKeys);
  const toolsByName = new Map(data.tools.map((tool) => [normalizeName(tool.name), tool]));
  const relationshipBuilderGroups = getRelationshipBuilderGroups(data);
  const relationshipBuilderItems: RelationshipTemplateItem[] = relationshipBuilderGroups.flatMap(
    (group) => group.items.map((item) => ({ ...item, group: group.name })),
  );

  useEffect(() => {
    window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const fromType = params.get("fromType");
      const fromId = params.get("fromId");
      if ((fromType === "project" || fromType === "tool") && fromId) {
        setDefaultFrom({ type: fromType, id: fromId });
        setIsAdding(true);
      }
    }, 0);
  }, []);

  function templateKey(templateItem: RelationshipTemplateItem) {
    return `${templateItem.group}:${templateItem.relationshipType}:${templateItem.toolName}`;
  }

  function toggleTemplateItem(templateItem: RelationshipTemplateItem) {
    const key = templateKey(templateItem);
    setSelectedTemplateKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  function addSelectedRelationships() {
    if (!selectedTemplateProjectId) {
      setTemplateMessage("Add a project before using the relationship builder.");
      return;
    }

    const added: string[] = [];
    const skipped: string[] = [];
    const missing: string[] = [];
    const selectedItems = relationshipBuilderItems.filter((item) =>
      selectedTemplateKeySet.has(templateKey(item)),
    );

    if (!selectedItems.length) {
      setTemplateMessage("Select one or more relationship options first.");
      return;
    }

    selectedItems.forEach((templateItem) => {
      const tool = findTemplateTool(toolsByName, templateItem);
      if (!tool) {
        missing.push(templateItem.toolName);
        return;
      }

      if (
        relationshipExists(
          data,
          selectedTemplateProjectId,
          tool.id,
          templateItem.relationshipType,
        )
      ) {
        skipped.push(`${getRelationshipLabel(templateItem.relationshipType)} ${tool.name}`);
        return;
      }

      addRelationship({
        fromType: "project",
        fromId: selectedTemplateProjectId,
        toType: "tool",
        toId: tool.id,
        relationshipType: templateItem.relationshipType,
        notes: templateItem.notes,
      });
      added.push(`${getRelationshipLabel(templateItem.relationshipType)} ${tool.name}`);
    });

    const parts = [
      added.length ? `Added ${added.length} relationship${added.length === 1 ? "" : "s"}.` : "",
      skipped.length ? `Skipped ${skipped.length} existing.` : "",
      missing.length ? `Missing tools: ${missing.join(", ")}.` : "",
    ].filter(Boolean);

    setSelectedTemplateKeys([]);
    setTemplateMessage(parts.join(" "));
  }

  const columns: TableColumn<Relationship>[] = [
    {
      header: "From",
      cell: (item) => getEntityName(data, item.fromType, item.fromId),
      sortValue: (item) => getEntityName(data, item.fromType, item.fromId),
    },
    {
      header: "Relationship",
      cell: (item) => getRelationshipLabel(item.relationshipType),
      sortValue: (item) => item.relationshipType,
    },
    {
      header: "To",
      cell: (item) => getEntityName(data, item.toType, item.toId),
      sortValue: (item) => getEntityName(data, item.toType, item.toId),
    },
    { header: "Notes", cell: (item) => item.notes || "No notes", sortValue: (item) => item.notes },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Relationships</h1>
          <p className="mt-1 text-sm text-slate-600">Connect projects and tools with manual relationship records.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Relationship
        </button>
      </header>

      {(isAdding || editing) && (
        <RelationshipForm
          projects={data.projects}
          tools={data.tools}
          initialValue={editing ?? undefined}
          defaultFrom={!editing ? defaultFrom : undefined}
          onCancel={() => {
            setIsAdding(false);
            setEditing(null);
            setDefaultFrom(undefined);
          }}
          onSave={(value) => {
            if (editing) updateRelationship(editing.id, value);
            else addRelationship(value);
            setIsAdding(false);
            setEditing(null);
            setDefaultFrom(undefined);
          }}
        />
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Relationship Builder</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pick only the relationships that apply. Existing links are disabled, and missing
              tools are clearly marked.
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Manual helper
          </span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Project
            <select
              value={selectedTemplateProjectId}
              onChange={(event) => {
                setTemplateProjectId(event.target.value);
                setSelectedTemplateKeys([]);
                setTemplateMessage("");
              }}
              className="rounded-md border border-slate-300 px-3 py-2 font-normal"
            >
              {data.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={addSelectedRelationships}
            disabled={!data.projects.length || !selectedTemplateKeys.length}
            className="inline-flex items-center justify-center gap-2 self-end rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Wand2 className="h-4 w-4" aria-hidden="true" />
            Add Selected
          </button>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {relationshipBuilderGroups.map((group) => (
            <div key={group.name} className="rounded-md border border-slate-200 p-3">
              <h3 className="text-sm font-semibold text-slate-950">{group.name}</h3>
              <div className="mt-3 grid gap-2">
                {group.items.map((rawItem) => {
                  const item = { ...rawItem, group: group.name };
                  const tool = findTemplateTool(toolsByName, item);
                  const exists = Boolean(
                    tool &&
                      selectedTemplateProjectId &&
                      relationshipExists(
                        data,
                        selectedTemplateProjectId,
                        tool.id,
                        item.relationshipType,
                      ),
                  );
                  const missing = !tool;
                  const disabled = exists || missing || !selectedTemplateProjectId;
                  const key = templateKey(item);
                  const checked = exists || selectedTemplateKeySet.has(key);

                  return (
                    <label
                      key={key}
                      className={[
                        "flex items-start gap-3 rounded-md border px-3 py-2 text-sm",
                        disabled
                          ? "border-slate-200 bg-slate-50 text-slate-500"
                          : "border-slate-200 bg-white text-slate-800 hover:border-indigo-300 hover:bg-indigo-50",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleTemplateItem(item)}
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-slate-900">
                          {getRelationshipLabel(item.relationshipType)} {item.toolName}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {exists ? "Already added" : missing ? "Tool not found" : item.notes}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {templateMessage ? (
          <p className="mt-3 rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
            {templateMessage}
          </p>
        ) : null}
      </section>

      <EntityTable
        items={data.relationships}
        columns={columns}
        emptyMessage="No relationships yet."
        emptyDetail="Add a relationship to connect a project to a tool or another tool."
        onEdit={startEditing}
        onDelete={(id) => {
          if (window.confirm("Delete this relationship?")) {
            deleteRelationship(id);
          }
        }}
      />
    </div>
  );
}
