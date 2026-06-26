"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { EntityTable, type TableColumn } from "@/components/EntityTable";
import { RelationshipForm } from "@/components/RelationshipForm";
import { useStackMapData } from "@/lib/storage";
import type { EntityType, Relationship } from "@/lib/types";
import { getEntityName } from "@/lib/utils";

export default function RelationshipsPage() {
  const { data, addRelationship, updateRelationship, deleteRelationship } = useStackMapData();
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<Relationship | null>(null);
  const [defaultFrom, setDefaultFrom] = useState<{ type: EntityType; id: string } | undefined>();

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

  const columns: TableColumn<Relationship>[] = [
    {
      header: "From",
      cell: (item) => getEntityName(data, item.fromType, item.fromId),
      sortValue: (item) => getEntityName(data, item.fromType, item.fromId),
    },
    {
      header: "Relationship",
      cell: (item) => item.relationshipType,
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
        <button onClick={() => setIsAdding(true)} className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
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

      <EntityTable
        items={data.relationships}
        columns={columns}
        emptyMessage="No relationships yet."
        emptyDetail="Add a relationship to connect a project to a tool or another tool."
        onEdit={setEditing}
        onDelete={(id) => {
          if (window.confirm("Delete this relationship?")) {
            deleteRelationship(id);
          }
        }}
      />
    </div>
  );
}
