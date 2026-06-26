"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { EntityTable, type TableColumn } from "@/components/EntityTable";
import { ProjectForm } from "@/components/ProjectForm";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/lib/constants";
import { useStackMapData } from "@/lib/storage";
import type { Project } from "@/lib/types";
import { getProjectReviewItems } from "@/lib/utils";

export default function ProjectsPage() {
  const { data, addProject, updateProject, deleteProject } = useStackMapData();
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredProjects = data.projects.filter(
    (project) =>
      (typeFilter === "all" || project.type === typeFilter) &&
      (statusFilter === "all" || project.status === statusFilter),
  );

  const columns: TableColumn<Project>[] = [
    { header: "Name", cell: (item) => <span className="font-medium text-slate-950">{item.name}</span> },
    { header: "Type", cell: (item) => item.type },
    { header: "Status", cell: (item) => item.status },
    {
      header: "Review",
      cell: (item) => {
        const count = getProjectReviewItems(item, data).length;
        return count ? `${count} item${count === 1 ? "" : "s"}` : "Clear";
      },
    },
    { header: "Notes", cell: (item) => item.notes || "No notes" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Projects</h1>
          <p className="mt-1 text-sm text-slate-600">Add, edit, and remove manual project records.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Project
        </button>
      </header>

      {(isAdding || editing) && (
        <ProjectForm
          initialValue={editing ?? undefined}
          onCancel={() => {
            setIsAdding(false);
            setEditing(null);
          }}
          onSave={(value) => {
            if (editing) updateProject(editing.id, value);
            else addProject(value);
            setIsAdding(false);
            setEditing(null);
          }}
        />
      )}

      <section className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Type
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 font-normal">
            <option value="all">All types</option>
            {PROJECT_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 font-normal">
            <option value="all">All statuses</option>
            {PROJECT_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <p className="text-sm text-slate-500">
          Showing {filteredProjects.length} of {data.projects.length}
        </p>
      </section>

      <EntityTable
        items={filteredProjects}
        columns={columns}
        emptyMessage="No projects match the current filters."
        emptyDetail="Clear the filters or add a new project record."
        getViewHref={(item) => `/projects/${item.id}`}
        onEdit={setEditing}
        onDelete={(id) => {
          if (window.confirm("Delete this project and its relationships?")) {
            deleteProject(id);
          }
        }}
      />
    </div>
  );
}
