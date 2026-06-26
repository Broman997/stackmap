"use client";

import Link from "next/link";
import { ArrowLeft, FlaskConical, Lock, ShieldCheck } from "lucide-react";

const detectionItems = [
  "Repositories as project suggestions",
  "Package dependencies as tool suggestions",
  "Deployment hints as relationship suggestions",
  "README and package metadata as notes",
  "Repository topics as tags later",
];

const permissionItems = [
  "Read-only metadata access only",
  "No cloning by default",
  "No write actions",
  "No commits, tags, pull requests, or pushes",
  "No repository modification",
];

const blockedItems = [
  "No token input is implemented yet",
  "No OAuth flow is implemented yet",
  "No secrets are stored",
  "No GitHub API route exists",
  "No connection will be attempted from this page",
];

export default function GitHubIntegrationPrepPage() {
  return (
    <div className="space-y-5">
      <Link
        href="/integrations"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Integrations
      </Link>

      <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Read-only preparation</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">GitHub Integration Prep</h1>
        <p className="mt-2 text-sm text-slate-600">
          This page defines the future GitHub integration shape. It does not connect
          to GitHub, request credentials, scan repositories, or call external APIs.
        </p>
      </header>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Implementation is blocked until explicit approval. Future GitHub data must
        become Suggestions first, then be manually accepted or dismissed.
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-cyan-700" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-950">May Detect Later</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {detectionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-cyan-700" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-950">Permission Plan</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {permissionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-cyan-700" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-950">Not Implemented</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {blockedItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Suggestion Contract</h2>
        <p className="mt-2 text-sm text-slate-600">
          A future GitHub connector should output the same local suggestion objects
          that Mock Runs already generate. Confirmed records must only be created
          from the Suggestions page after manual approval.
        </p>
        <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="font-medium text-slate-900">Project suggestion</p>
            <p>source: github</p>
            <p>entityType: project</p>
            <p>detectedFields: name, type, status, notes</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="font-medium text-slate-900">Tool suggestion</p>
            <p>source: github</p>
            <p>entityType: tool</p>
            <p>detectedFields: dependency name, category, notes</p>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <Link
          href="/mock-runs"
          className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          Run GitHub Mock
        </Link>
        <Link
          href="/suggestions"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Open Suggestions
        </Link>
        <Link
          href="/integrations"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Integration Plans
        </Link>
      </section>
    </div>
  );
}
