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
};

export function ProjectForm({
  initialValue,
  onSave,
  onCancel,
}: {
  initialValue?: Project;
  onSave: (value: ProjectFormValue) => void;
  onCancel: () => void;
}) {
  const value = initialValue ?? defaultValue;
  const [error, setError] = useState("");

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
        });
      }}
    >
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-1">
          Name
          <input
            name="name"
            required
            defaultValue={value.name}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Type
          <select
            name="type"
            defaultValue={value.type}
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
            defaultValue={value.status}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Notes
        <textarea
          name="notes"
          rows={3}
          defaultValue={value.notes}
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
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Save Project
        </button>
      </div>
    </form>
  );
}
