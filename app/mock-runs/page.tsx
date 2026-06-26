"use client";

import Link from "next/link";
import { FlaskConical, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { INTEGRATION_SOURCES } from "@/lib/constants";
import { useStackMapData } from "@/lib/storage";
import type {
  IntegrationSource,
  SuggestionEntityType,
  SuggestionFieldValue,
} from "@/lib/types";

type MockDetection = {
  entityType: SuggestionEntityType;
  confidence: number;
  detectedFields: Record<string, SuggestionFieldValue>;
  notes: string;
};

const mockPayloads: Record<IntegrationSource, MockDetection[]> = {
  github: [
    {
      entityType: "project",
      confidence: 0.86,
      detectedFields: {
        name: "Sample Web Dashboard",
        type: "website",
        status: "active",
        notes: "Mock GitHub repo detection. No GitHub connection was made.",
      },
      notes: "Mock repository looked like a website project.",
    },
    {
      entityType: "tool",
      confidence: 0.78,
      detectedFields: {
        name: "Vercel",
        category: "hosting",
        paidStatus: "unknown",
        status: "unknown",
        notes: "Mock dependency/deployment hint. No account connection was made.",
      },
      notes: "Mock deployment hint from repository metadata.",
    },
  ],
  supabase: [
    {
      entityType: "tool",
      confidence: 0.9,
      detectedFields: {
        name: "Supabase Project - Sample Inventory",
        category: "database",
        paidStatus: "unknown",
        status: "unknown",
        notes: "Mock Supabase project detection. No Supabase connection was made.",
      },
      notes: "Mock database project suggestion.",
    },
    {
      entityType: "relationship",
      confidence: 0.62,
      detectedFields: {
        fromType: "project",
        fromName: "Sample Web Dashboard",
        toType: "tool",
        toName: "Supabase Project - Sample Inventory",
        relationshipType: "stores_data_in",
      },
      notes: "Mock relationship suggestion. Needs manual matching before it can become a real relationship.",
    },
  ],
  app_store: [
    {
      entityType: "project",
      confidence: 0.83,
      detectedFields: {
        name: "Sample iOS Utility",
        type: "iOS app",
        status: "active",
        notes: "Mock App Store app detection. No Apple connection was made.",
      },
      notes: "Mock iOS app listing suggestion.",
    },
    {
      entityType: "tool",
      confidence: 0.7,
      detectedFields: {
        name: "Apple Developer",
        category: "app store",
        paidStatus: "paid",
        status: "active",
        notes: "Mock publishing tool suggestion.",
      },
      notes: "Mock publishing relationship source.",
    },
  ],
  google_play: [
    {
      entityType: "project",
      confidence: 0.83,
      detectedFields: {
        name: "Sample Android Utility",
        type: "Android app",
        status: "active",
        notes: "Mock Google Play app detection. No Google connection was made.",
      },
      notes: "Mock Android app listing suggestion.",
    },
    {
      entityType: "tool",
      confidence: 0.7,
      detectedFields: {
        name: "Google Play Console",
        category: "app store",
        paidStatus: "paid",
        status: "active",
        notes: "Mock publishing tool suggestion.",
      },
      notes: "Mock publishing relationship source.",
    },
  ],
  gmail: [
    {
      entityType: "subscription",
      confidence: 0.68,
      detectedFields: {
        vendorName: "Sample SaaS Receipt",
        amount: 19,
        currency: "USD",
        billingCycle: "monthly",
        status: "active",
      },
      notes: "Mock receipt suggestion. No Gmail connection was made.",
    },
    {
      entityType: "tool",
      confidence: 0.6,
      detectedFields: {
        name: "Sample SaaS Receipt",
        category: "other",
        paidStatus: "paid",
        status: "unknown",
      },
      notes: "Mock vendor suggestion from receipt text.",
    },
  ],
  payment: [
    {
      entityType: "subscription",
      confidence: 0.74,
      detectedFields: {
        vendorName: "Sample Cloud Charge",
        amount: 12.5,
        currency: "USD",
        billingCycle: "monthly",
        status: "active",
      },
      notes: "Mock payment transaction suggestion. No payment source connection was made.",
    },
    {
      entityType: "tool",
      confidence: 0.64,
      detectedFields: {
        name: "Sample Cloud Charge",
        category: "hosting",
        paidStatus: "paid",
        status: "unknown",
      },
      notes: "Mock vendor suggestion from payment line item.",
    },
  ],
  airtable: [
    {
      entityType: "project",
      confidence: 0.72,
      detectedFields: {
        name: "Sample Airtable Project",
        type: "other",
        status: "active",
        notes: "Mock Airtable row detection. No Airtable connection was made.",
      },
      notes: "Mock reference row imported as a suggestion.",
    },
    {
      entityType: "tool",
      confidence: 0.66,
      detectedFields: {
        name: "Airtable",
        category: "database",
        paidStatus: "unknown",
        status: "unknown",
      },
      notes: "Mock Airtable source tool suggestion.",
    },
  ],
};

export default function MockRunsPage() {
  const { data, addSuggestion } = useStackMapData();
  const [source, setSource] = useState<IntegrationSource>("github");
  const [message, setMessage] = useState("");
  const payload = mockPayloads[source];
  const pendingCount = data.suggestions.filter((suggestion) => suggestion.status === "pending").length;

  const sourceStatus = useMemo(
    () => data.integrationPlans.find((plan) => plan.source === source)?.status ?? "planned",
    [data.integrationPlans, source],
  );

  function runMockDetection() {
    payload.forEach((detection) => {
      addSuggestion({
        source,
        entityType: detection.entityType,
        confidence: detection.confidence,
        detectedFields: detection.detectedFields,
        notes: `${detection.notes} Mock run only. Review manually before accepting.`,
      });
    });
    setMessage(
      `Created ${payload.length} mock ${source} suggestion${payload.length === 1 ? "" : "s"}.`,
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Mock Runs</h1>
        <p className="mt-1 text-sm text-slate-600">
          Generate local fake detections to test the future integration pipeline.
        </p>
      </header>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Mock runs do not connect to external services. They only create local suggestions
        using hardcoded sample payloads.
      </section>

      <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Run Setup</h2>
          <label className="mt-4 grid gap-1 text-sm font-medium text-slate-700">
            Source
            <select
              value={source}
              onChange={(event) => setSource(event.target.value as IntegrationSource)}
              className="rounded-md border border-slate-300 px-3 py-2 font-normal"
            >
              {INTEGRATION_SOURCES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Plan status</dt>
              <dd className="font-medium text-slate-900">{sourceStatus}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Mock detections</dt>
              <dd className="font-medium text-slate-900">{payload.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Pending suggestions</dt>
              <dd className="font-medium text-slate-900">{pendingCount}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={runMockDetection}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Generate Mock Suggestions
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-950">Payload Preview</h2>
            <FlaskConical className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </div>
          <div className="divide-y divide-slate-100">
            {payload.map((detection, index) => (
              <article key={`${source}-${index}`} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold uppercase text-slate-600">
                    {detection.entityType}
                  </span>
                  <span className="text-sm text-slate-500">
                    {Math.round(detection.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{detection.notes}</p>
                <div className="mt-3 grid gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600 sm:grid-cols-2">
                  {Object.entries(detection.detectedFields).map(([key, value]) => (
                    <p key={key}>
                      <span className="font-medium text-slate-800">{key}:</span>{" "}
                      {String(value ?? "")}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/suggestions"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Open Suggestions
        </Link>
        {message ? (
          <p className="rounded-md border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm text-cyan-800">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
