"use client";

import { StackMapFlow } from "@/components/StackMapFlow";
import { useStackMapData } from "@/lib/storage";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MapPage() {
  const { data } = useStackMapData();
  const router = useRouter();

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Visual Map</h1>
          <p className="mt-1 text-sm text-slate-600">
            Click a project to see the tools and relationships connected to it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
      </header>
      <StackMapFlow data={data} />
    </div>
  );
}
