"use client";

import { StackMapFlow } from "@/components/StackMapFlow";
import { useStackMapData } from "@/lib/storage";

export default function MapPage() {
  const { data } = useStackMapData();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Visual Map</h1>
        <p className="mt-1 text-sm text-slate-600">
          Projects and tools are shown as nodes. Filter the view to inspect relationships and review gaps.
        </p>
      </header>
      <StackMapFlow data={data} />
    </div>
  );
}
