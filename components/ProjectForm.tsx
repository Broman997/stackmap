"use client";

import { PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/constants";
import type { Project } from "@/lib/types";
import { useState } from "react";

type ProjectFormValue = Omit<Project, "id" | "createdAt" | "updatedAt">;

const defaultValue: ProjectFormValue = {
  name: "",
  type: "other",
  status: "active",
  notes: "",
  appStoreUrl: "",
  googlePlayUrl: "",
};

export function ProjectForm({
  initialValue,
  reviewItems = [],
  onSave,
  onCancel,
}: {
  initialValue?: Project;
  reviewItems?: string[];
  onSave: (value: ProjectFormValue) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<ProjectFormValue>(initialValue ?? defaultValue);
  const [error, setError] = useState("");

  function updateValue<K extends keyof ProjectFormValue>(key: K, nextValue: ProjectFormValue[K]) {
    setValue((current) => ({ ...current, [key]: nextValue }));
  }

  return (
    <form
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const name = String(formData.get("name") ?? "").trim();
        if (!name) {
          setError("Project name is required.");
          return;
        }
        setError("");
        onSave({
          name,
          type: String(formData.get("type") ?? "other") as ProjectFormValue["type"],
          status: String(formData.get("status") ?? "active") as ProjectFormValue["status"],
          notes: String(formData.get("notes") ?? "").trim(),
          appStoreUrl: String(formData.get("appStoreUrl") ?? "").trim() || undefined,
          googlePlayUrl: String(formData.get("googlePlayUrl") ?? "").trim() || undefined,
        });
      }}
    >
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {reviewItems.length ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3">
          <h2 className="text-sm font-semibold text-amber-950">Issues to fix</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {reviewItems.map((item) => (
              <span key={item} className="rounded-md bg-white px-2 py-1 text-xs font-medium text-amber-800">
                {item}
              </span>
            ))}
          </div>
        </section>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-1">
          Name
          <input
            name="name"
            required
            value={value.name}
            onChange={(event) => updateValue("name", event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Type
          <select
            name="type"
            value={value.type}
            onChange={(event) => updateValue("type", event.target.value as ProjectFormValue["type"])}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          >
            {PROJECT_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Status
          <select
            name="status"
            value={value.status}
            onChange={(event) =>
              updateValue("status", event.target.value as ProjectFormValue["status"])
            }
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          App Store URL
          <input
            name="appStoreUrl"
            type="url"
            value={value.appStoreUrl ?? ""}
            onChange={(event) => updateValue("appStoreUrl", event.target.value)}
            placeholder="https://apps.apple.com/..."
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Google Play URL
          <input
            name="googlePlayUrl"
            type="url"
            value={value.googlePlayUrl ?? ""}
            onChange={(event) => updateValue("googlePlayUrl", event.target.value)}
            placeholder="https://play.google.com/store/apps/..."
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Notes
        <textarea
          name="notes"
          rows={3}
          value={value.notes}
          onChange={(event) => updateValue("notes", event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 font-normal"
        />
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Save Project
        </button>
      </div>
    </form>
  );
}
