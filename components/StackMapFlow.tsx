"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Expand, Shrink } from "lucide-react";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import type { StackMapData } from "@/lib/types";
import { cn, getEntityName, getProjectReviewItems, getToolReviewItems } from "@/lib/utils";

type MapFilter = "all" | "projects" | "tools" | "connected" | "review";

type MapNodeData = {
  label: string;
  kind: "Project" | "Tool";
  meta: string;
  notes: string;
  href: string;
  reviewCount: number;
  lane: "Workspace" | "AI" | "Project" | "Support";
};

const filterOptions: Array<{ value: MapFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "projects", label: "Projects" },
  { value: "tools", label: "Tools" },
  { value: "connected", label: "Connected" },
  { value: "review", label: "Review Needed" },
];

const workspaceToolNames = [
  "visual studio",
  "vs code",
  "xcode",
  "android studio",
  "cursor",
];

const aiToolNames = ["chatgpt", "codex", "claude", "openai"];

function getToolLane(tool: StackMapData["tools"][number]): MapNodeData["lane"] {
  const name = tool.name.toLowerCase();
  if (workspaceToolNames.some((workspaceName) => name.includes(workspaceName))) {
    return "Workspace";
  }
  if (tool.category === "AI" || aiToolNames.some((aiName) => name.includes(aiName))) {
    return "AI";
  }
  return "Support";
}

function getLanePosition(lane: MapNodeData["lane"], index: number) {
  const xByLane: Record<MapNodeData["lane"], number> = {
    Workspace: 0,
    AI: 360,
    Project: 720,
    Support: 1080,
  };

  return {
    x: xByLane[lane],
    y: index * 115,
  };
}

function getRelationshipLabel(type: string) {
  return type.replaceAll("_", " ");
}

export function StackMapFlow({ data }: { data: StackMapData }) {
  const [selected, setSelected] = useState<MapNodeData | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MapFilter>("all");
  const [isFullScreen, setIsFullScreen] = useState(false);

  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    data.relationships.forEach((relationship) => {
      ids.add(`${relationship.fromType}:${relationship.fromId}`);
      ids.add(`${relationship.toType}:${relationship.toId}`);
    });
    return ids;
  }, [data.relationships]);

  const allNodes = useMemo<Node<MapNodeData>[]>(() => {
    const laneIndexes: Record<MapNodeData["lane"], number> = {
      Workspace: 0,
      AI: 0,
      Project: 0,
      Support: 0,
    };

    const projectNodes = data.projects.map((project, index) => {
      const reviewCount = getProjectReviewItems(project, data).length;
      const lane = "Project" as const;
      return {
        id: `project:${project.id}`,
        position: getLanePosition(lane, laneIndexes[lane]++),
        data: {
          label: project.name,
          kind: "Project" as const,
          meta: `${project.type} / ${project.status}`,
          notes: project.notes,
          href: `/projects/${project.id}`,
          reviewCount,
          lane,
        },
        style: {
          border: reviewCount ? "2px solid #d97706" : "1px solid #0891b2",
          background: "#ecfeff",
          color: "#164e63",
          borderRadius: 8,
          padding: 12,
          width: 230,
          boxShadow: reviewCount ? "0 0 0 3px #fef3c7" : undefined,
        },
      };
    });

    const toolNodes = data.tools.map((tool, index) => {
      const reviewCount = getToolReviewItems(tool, data).length;
      const lane = getToolLane(tool);
      return {
        id: `tool:${tool.id}`,
        position: getLanePosition(lane, laneIndexes[lane]++),
        data: {
          label: tool.name,
          kind: "Tool" as const,
          meta: `${tool.category} / ${tool.status}`,
          notes: tool.notes,
          href: `/tools/${tool.id}`,
          reviewCount,
          lane,
        },
        style: {
          border: reviewCount ? "2px solid #d97706" : "1px solid #d97706",
          background: lane === "AI" ? "#f5f3ff" : "#fffbeb",
          color: lane === "AI" ? "#4c1d95" : "#78350f",
          borderRadius: 8,
          padding: 12,
          width: 230,
          boxShadow: reviewCount ? "0 0 0 3px #fef3c7" : undefined,
        },
      };
    });

    return [...projectNodes, ...toolNodes];
  }, [data]);

  const filteredNodes = useMemo(() => {
    return allNodes.filter((node) => {
      if (filter === "projects") return node.data.kind === "Project";
      if (filter === "tools") return node.data.kind === "Tool";
      if (filter === "connected") return connectedIds.has(node.id);
      if (filter === "review") return node.data.reviewCount > 0;
      return true;
    });
  }, [allNodes, connectedIds, filter]);

  const focusedNodeIds = useMemo(() => {
    if (!focusedNodeId) return null;

    const ids = new Set([focusedNodeId]);
    let frontier = new Set([focusedNodeId]);

    for (let depth = 0; depth < 2; depth += 1) {
      const nextFrontier = new Set<string>();

      data.relationships.forEach((relationship) => {
        const source = `${relationship.fromType}:${relationship.fromId}`;
        const target = `${relationship.toType}:${relationship.toId}`;

        if (frontier.has(source) && !ids.has(target)) {
          ids.add(target);
          nextFrontier.add(target);
        }

        if (frontier.has(target) && !ids.has(source)) {
          ids.add(source);
          nextFrontier.add(source);
        }
      });

      frontier = nextFrontier;
      if (!frontier.size) break;
    }

    if (focusedNodeId.startsWith("project:")) {
      Array.from(ids).forEach((id) => {
        if (id.startsWith("project:") && id !== focusedNodeId) {
          ids.delete(id);
        }
      });
    }

    const includedProjectIds = new Set(
      Array.from(ids)
        .filter((id) => id.startsWith("project:"))
        .map((id) => id.replace("project:", "")),
    );

    data.relationships.forEach((relationship) => {
      const source = `${relationship.fromType}:${relationship.fromId}`;
      const target = `${relationship.toType}:${relationship.toId}`;

      if (relationship.fromType === "project" && includedProjectIds.has(relationship.fromId)) {
        if (!target.startsWith("project:")) ids.add(target);
      }

      if (relationship.toType === "project" && includedProjectIds.has(relationship.toId)) {
        if (!source.startsWith("project:")) ids.add(source);
      }
    });

    const nodeById = new Map(allNodes.map((node) => [node.id, node]));
    const includedAiToolIds = new Set(
      Array.from(ids).filter((id) => nodeById.get(id)?.data.lane === "AI"),
    );

    data.relationships.forEach((relationship) => {
      const source = `${relationship.fromType}:${relationship.fromId}`;
      const target = `${relationship.toType}:${relationship.toId}`;
      const sourceNode = nodeById.get(source);
      const targetNode = nodeById.get(target);

      if (includedAiToolIds.has(source) && targetNode?.data.lane === "Workspace") {
        ids.add(target);
      }

      if (includedAiToolIds.has(target) && sourceNode?.data.lane === "Workspace") {
        ids.add(source);
      }
    });

    return ids;
  }, [allNodes, data.relationships, focusedNodeId]);

  const nodes = useMemo(() => {
    if (!focusedNodeIds) return filteredNodes;
    return filteredNodes.filter((node) => focusedNodeIds.has(node.id));
  }, [filteredNodes, focusedNodeIds]);

  const visibleNodeIds = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes]);

  const edges = useMemo<Edge[]>(
    () =>
      data.relationships
        .map((relationship) => ({
          id: relationship.id,
          source: `${relationship.fromType}:${relationship.fromId}`,
          target: `${relationship.toType}:${relationship.toId}`,
          label: getRelationshipLabel(relationship.relationshipType),
          animated: false,
          style: { stroke: "#475569", strokeWidth: 2 },
          labelStyle: { fill: "#334155", fontWeight: 600, fontSize: 12 },
          labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
        }))
        .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
        .filter((edge) => {
          if (!focusedNodeIds) return true;
          return focusedNodeIds.has(edge.source) && focusedNodeIds.has(edge.target);
        }),
    [data.relationships, focusedNodeIds, visibleNodeIds],
  );

  const reviewNodeCount = allNodes.filter((node) => node.data.reviewCount > 0).length;
  const focusedLabel = focusedNodeId
    ? allNodes.find((node) => node.id === focusedNodeId)?.data.label
    : "";

  function changeFilter(nextFilter: MapFilter) {
    setFilter(nextFilter);
    setFocusedNodeId(null);
    setSelected(null);
  }

  function clearFocus() {
    setFocusedNodeId(null);
    setSelected(null);
  }

  const flowKey = `${filter}-${focusedNodeId ?? "all"}-${isFullScreen ? "full" : "inline"}`;
  function renderFlowCanvas() {
    return (
      <ReactFlow
        key={flowKey}
        nodes={nodes}
        edges={edges}
        fitView
        onNodeClick={(_, node) => {
          setSelected(node.data);
          setFocusedNodeId(node.id);
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    );
  }

  const filterPanel = (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-2 text-slate-600">
            <span className="h-3 w-3 rounded-sm border border-cyan-700 bg-cyan-50" />
            Projects
          </span>
          <span className="inline-flex items-center gap-2 text-slate-600">
            <span className="h-3 w-3 rounded-sm border border-amber-700 bg-amber-50" />
            Tools
          </span>
          <span className="inline-flex items-center gap-2 text-slate-600">
            <span className="h-3 w-3 rounded-sm border border-violet-700 bg-violet-50" />
            AI tools
          </span>
          <span className="inline-flex items-center gap-2 text-slate-600">
            <span className="h-3 w-3 rounded-sm border-2 border-amber-600 bg-white shadow-[0_0_0_3px_#fef3c7]" />
            Review needed
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => changeFilter(option.value)}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-medium",
                filter === option.value
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100",
              )}
            >
              {option.label}
            </button>
          ))}
          {focusedNodeId ? (
            <button
              type="button"
              onClick={clearFocus}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Show all
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setIsFullScreen((current) => !current)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            {isFullScreen ? (
              <Shrink className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Expand className="h-4 w-4" aria-hidden="true" />
            )}
            {isFullScreen ? "Exit full screen" : "Full screen map"}
          </button>
        </div>
      </div>
      {focusedNodeId ? (
        <p className="mt-4 rounded-md bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-800">
          Focused on {focusedLabel}. Showing nearby workflow relationships and project tools.
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-4">
        <p>{nodes.length} visible nodes</p>
        <p>{edges.length} visible edges</p>
        <p>{connectedIds.size} connected records</p>
        <p>{reviewNodeCount} review-needed nodes</p>
      </div>
    </section>
  );

  const detailsPanel = (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">Node Details</h2>
      {selected ? (
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {selected.kind}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{selected.label}</p>
          </div>
          <p className="rounded-md bg-slate-100 px-3 py-2 text-slate-700">
            {selected.meta}
          </p>
          {selected.reviewCount ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 font-medium text-amber-800">
              {selected.reviewCount} review item{selected.reviewCount === 1 ? "" : "s"}
            </p>
          ) : (
            <p className="rounded-md bg-emerald-50 px-3 py-2 font-medium text-emerald-800">
              No review flags
            </p>
          )}
          <p className="text-slate-600">{selected.notes || "No notes yet."}</p>
          <Link
            href={selected.href}
            className="inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Open details
          </Link>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Select any project or tool node to view details.
        </p>
      )}
      <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-600">
        <p>{data.projects.length} projects</p>
        <p>{data.tools.length} tools</p>
        <p>{data.relationships.length} relationships</p>
      </div>
      <div className="mt-4 space-y-2 text-xs text-slate-500">
        {data.relationships.slice(0, 5).map((relationship) => (
          <p key={relationship.id}>
          {getEntityName(data, relationship.fromType, relationship.fromId)}{" "}
            {getRelationshipLabel(relationship.relationshipType)}{" "}
            {getEntityName(data, relationship.toType, relationship.toId)}
          </p>
        ))}
      </div>
    </aside>
  );

  return (
    <div className="space-y-4">
      {filterPanel}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="h-[620px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {renderFlowCanvas()}
        </div>
        {detailsPanel}
      </div>

      {isFullScreen ? (
        <div className="fixed inset-0 z-50 grid grid-rows-[auto_minmax(0,1fr)] gap-3 bg-slate-50 p-4">
          {filterPanel}
          <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              {renderFlowCanvas()}
            </div>
            <div className="hidden min-h-0 overflow-y-auto xl:block">
              {detailsPanel}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
