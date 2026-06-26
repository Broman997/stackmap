"use client";

import { RELATIONSHIP_TYPES } from "@/lib/constants";
import type { EntityType, Project, Relationship, Tool } from "@/lib/types";
import { useState } from "react";

type RelationshipFormValue = Omit<Relationship, "id" | "createdAt" | "updatedAt">;

function entityOptions(projects: Project[], tools: Tool[]) {
  return [
    ...projects.map((project) => ({
      value: `project:${project.id}`,
      label: `Project: ${project.name}`,
    })),
    ...tools.map((tool) => ({
      value: `tool:${tool.id}`,
      label: `Tool: ${tool.name}`,
    })),
  ];
}

function splitEntity(value: string) {
  const [type, id] = value.split(":");
  return { type: type as EntityType, id };
}

export function RelationshipForm({
  projects,
  tools,
  initialValue,
  defaultFrom,
  onSave,
  onCancel,
}: {
  projects: Project[];
  tools: Tool[];
  initialValue?: Relationship;
  defaultFrom?: { type: EntityType; id: string };
  onSave: (value: RelationshipFormValue) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState("");
  const options = entityOptions(projects, tools);
  const first = options[0]?.value ?? "";
  const defaultFromValue = defaultFrom ? `${defaultFrom.type}:${defaultFrom.id}` : "";
  const defaultFromExists = options.some((option) => option.value === defaultFromValue);
  const fromValue = initialValue
    ? `${initialValue.fromType}:${initialValue.fromId}`
    : defaultFromExists
      ? defaultFromValue
      : first;
  const fallbackTo = options.find((option) => option.value !== fromValue)?.value ?? first;
  const toValue = initialValue ? `${initialValue.toType}:${initialValue.toId}` : fallbackTo;

  return (
    <form
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const from = splitEntity(String(formData.get("from") ?? ""));
        const to = splitEntity(String(formData.get("to") ?? ""));
        if (options.length < 2) {
          setError("Add at least two projects or tools before creating a relationship.");
          return;
        }
        if (from.type === to.type && from.id === to.id) {
          setError("A relationship needs two different records.");
          return;
        }
        setError("");
        onSave({
          fromType: from.type,
          fromId: from.id,
          toType: to.type,
          toId: to.id,
          relationshipType: String(
            formData.get("relationshipType") ?? "uses",
          ) as RelationshipFormValue["relationshipType"],
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
          From
          <select key={`from-${fromValue}`} name="from" required defaultValue={fromValue} className="rounded-md border border-slate-300 px-3 py-2 font-normal">
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Relationship
          <select name="relationshipType" defaultValue={initialValue?.relationshipType ?? "uses"} className="rounded-md border border-slate-300 px-3 py-2 font-normal">
            {RELATIONSHIP_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          To
          <select key={`to-${toValue}`} name="to" required defaultValue={toValue} className="rounded-md border border-slate-300 px-3 py-2 font-normal">
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Notes
        <textarea name="notes" rows={3} defaultValue={initialValue?.notes ?? ""} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Cancel
        </button>
        <button type="submit" disabled={options.length < 2} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          Save Relationship
        </button>
      </div>
    </form>
  );
}
