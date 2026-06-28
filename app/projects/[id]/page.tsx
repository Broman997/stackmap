"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { useStackMapData } from "@/lib/storage";
import {
  formatDate,
  getEntityName,
  getProjectReviewItems,
  getRelationshipLabel,
} from "@/lib/utils";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const { data } = useStackMapData();
  const project = data.projects.find((item) => item.id === params.id);

  if (!project) {
    return (
      <div className="space-y-4">
        <Link href="/projects" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Projects
        </Link>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-950">Project not found</h1>
          <p className="mt-2 text-sm text-slate-500">This local project record does not exist.</p>
        </div>
      </div>
    );
  }

  const reviewItems = getProjectReviewItems(project, data);
  const relationships = data.relationships.filter(
    (relationship) =>
      (relationship.fromType === "project" && relationship.fromId === project.id) ||
      (relationship.toType === "project" && relationship.toId === project.id),
  );

  return (
    <div className="space-y-5">
      <Link href="/projects" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Projects
      </Link>
      <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-cyan-700">{project.type}</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">{project.name}</h1>
            <p className="mt-2 text-sm text-slate-600">{project.notes || "No notes yet."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {project.appStoreUrl ? (
              <a href={project.appStoreUrl} target="_blank" rel="noreferrer" className="inline-flex items-center">
                <img src="/badges/app-store.svg" alt="Download on the App Store" className="h-10" />
              </a>
            ) : null}
            {project.googlePlayUrl ? (
              <a href={project.googlePlayUrl} target="_blank" rel="noreferrer" className="inline-flex items-center">
                <img src="/badges/google-play.png" alt="Get it on Google Play" className="h-10" />
              </a>
            ) : null}
            <Link
              href={`/projects?edit=${encodeURIComponent(project.id)}`}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit Project
            </Link>
            <Link
              href={`/relationships?fromType=project&fromId=${encodeURIComponent(project.id)}`}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Relationship
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Details</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Status</dt><dd className="font-medium text-slate-900">{project.status}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Created</dt><dd className="font-medium text-slate-900">{new Date(project.createdAt).toLocaleDateString()}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Updated</dt><dd className="font-medium text-slate-900">{new Date(project.updatedAt).toLocaleDateString()}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Source</dt><dd className="font-medium text-slate-900">{project.source ?? "manual"}</dd></div>
            {project.primaryLanguage ? (
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Language</dt><dd className="font-medium text-slate-900">{project.primaryLanguage}</dd></div>
            ) : null}
            {project.sourceVisibility ? (
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Visibility</dt><dd className="font-medium text-slate-900">{project.sourceVisibility}</dd></div>
            ) : null}
            {project.lastDetectedAt ? (
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Last detected</dt><dd className="font-medium text-slate-900">{formatDate(project.lastDetectedAt)}</dd></div>
            ) : null}
            {project.sourceUrl ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Source URL</dt>
                <dd className="min-w-0 text-right font-medium text-slate-900">
                  <a href={project.sourceUrl} target="_blank" rel="noreferrer" className="break-all text-indigo-600 hover:text-indigo-800">
                    {project.sourceName || project.sourceUrl}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Needs Attention</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {reviewItems.length ? reviewItems.map((item) => (
              <span key={item} className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">{item}</span>
            )) : <p className="text-sm text-slate-500">No required fixes.</p>}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Relationships</h2>
        <div className="mt-3 divide-y divide-slate-100">
          {relationships.map((relationship) => (
            <p key={relationship.id} className="py-3 text-sm text-slate-700">
              {getEntityName(data, relationship.fromType, relationship.fromId)} {getRelationshipLabel(relationship.relationshipType)} {getEntityName(data, relationship.toType, relationship.toId)}
            </p>
          ))}
          {relationships.length === 0 ? <p className="py-3 text-sm text-slate-500">No relationships yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
