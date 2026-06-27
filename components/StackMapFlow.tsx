"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Expand, Shrink } from "lucide-react";
import {
  Background,
  Controls,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import type { StackMapData } from "@/lib/types";
import {
  cn,
  getEntityName,
  getProjectReviewItems,
  getRelationshipLabel,
  getToolReviewItems,
} from "@/lib/utils";

type MapFilter = "all" | "projects" | "tools" | "connected" | "review";

type MapNodeData = {
  label: string;
  kind: "Project" | "Tool" | "Relationship";
  meta: string;
  notes: string;
  href?: string;
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

const focusedRelationshipOrder = [
  "uses",
  "assists_with",
  "depends_on",
  "deploys_to",
  "integrates_with",
  "stores_data_in",
  "publishes_to",
  "markets_through",
  "pays_for",
  "other",
];

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
    Project: 270,
    AI: 540,
    Support: 810,
  };

  return {
    x: xByLane[lane],
    y: index * 96,
  };
}

function getRelationshipOrder(type: string) {
  const index = focusedRelationshipOrder.indexOf(type);
  return index === -1 ? focusedRelationshipOrder.length : index;
}

function getToolOrder(tool: StackMapData["tools"][number]) {
  const name = tool.name.toLowerCase();
  if (name.includes("visual studio")) return 0;
  if (name.includes("vs code")) return 1;
  if (name.includes("xcode")) return 2;
  if (name.includes("android studio")) return 3;
  if (name.includes("cursor")) return 4;
  return 10;
}

function applyFocusedGroupLayout(
  nodes: Node<MapNodeData>[],
  relationships: StackMapData["relationships"],
  focusedNodeId: string | null,
) {
  if (!focusedNodeId) return nodes;

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const focusedNode = nodeById.get(focusedNodeId);
  if (!focusedNode) return nodes;

  const groups = new Map<string, Node<MapNodeData>[]>();
  const startNodeIds = new Set<string>();
  const startNodes: Node<MapNodeData>[] = [];
  relationships.forEach((relationship) => {
    const source = `${relationship.fromType}:${relationship.fromId}`;
    const target = `${relationship.toType}:${relationship.toId}`;
    const otherNodeId =
      source === focusedNodeId ? target : target === focusedNodeId ? source : null;

    const otherNode = otherNodeId ? nodeById.get(otherNodeId) : undefined;
    if (otherNode) {
      if (relationship.relationshipType === "uses" && otherNode.data.lane === "Workspace") {
        if (!startNodeIds.has(otherNode.id)) {
          startNodeIds.add(otherNode.id);
          startNodes.push(otherNode);
        }
        return;
      }

      groups.set(relationship.relationshipType, [
        ...(groups.get(relationship.relationshipType) ?? []),
        otherNode,
      ]);
    }
  });

  const groupEntries = Array.from(groups.entries())
    .map(([relationshipType, groupNodes]) => [
      relationshipType,
      [...groupNodes].sort((a, b) => a.data.label.localeCompare(b.data.label)),
    ] as const)
    .sort(([a], [b]) => getRelationshipOrder(a) - getRelationshipOrder(b) || a.localeCompare(b));

  const groupNodes: Node<MapNodeData>[] = [];
  const positionedRelatedNodes: Node<MapNodeData>[] = [];
  const relatedYStep = 106;
  const groupGap = 54;
  let y = 0;
  const startX = 0;
  const focusedX = 300;
  const groupX = 630;
  const relatedX = 960;

  groupEntries.forEach(([relationshipType, relatedNodes]) => {
    const groupStartY = y;
    relatedNodes.forEach((node, index) => {
      positionedRelatedNodes.push({
        ...node,
        position: { x: relatedX, y: groupStartY + index * relatedYStep },
      });
    });

    const groupY = groupStartY + ((relatedNodes.length - 1) * relatedYStep) / 2;
    groupNodes.push({
      id: `relationship-group:${relationshipType}`,
      position: { x: groupX, y: groupY },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: getRelationshipLabel(relationshipType),
        kind: "Relationship",
        meta: `${relatedNodes.length} linked record${relatedNodes.length === 1 ? "" : "s"}`,
        notes: "",
        reviewCount: 0,
        lane: "Support",
      },
      style: {
        border: "1px solid #64748b",
        background: "#f8fafc",
        color: "#0f172a",
        borderRadius: 8,
        padding: 10,
        width: 190,
        fontWeight: 700,
        textTransform: "capitalize",
      },
      draggable: false,
      selectable: false,
    });

    y += relatedNodes.length * relatedYStep + groupGap;
  });

  const focusedY = Math.max(0, (y - groupGap - relatedYStep) / 2);
  const positionedFocusedNode = {
    ...focusedNode,
    position: { x: focusedX, y: focusedY },
  };
  const positionedStartNodes = [...startNodes]
    .sort((a, b) => a.data.label.localeCompare(b.data.label))
    .map((node, index, list) => ({
      ...node,
      position: {
        x: startX,
        y: focusedY - ((list.length - 1) * relatedYStep) / 2 + index * relatedYStep,
      },
    }));

  return [...positionedStartNodes, positionedFocusedNode, ...groupNodes, ...positionedRelatedNodes];
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

    const projectNodes = data.projects.map((project) => {
      const reviewCount = getProjectReviewItems(project, data).length;
      const lane = "Project" as const;
      const nodeId = `project:${project.id}`;
      const generatedPosition = getLanePosition(lane, laneIndexes[lane]++);
      return {
        id: nodeId,
        position: generatedPosition,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
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
          padding: 10,
          width: 210,
          boxShadow: reviewCount ? "0 0 0 3px #fef3c7" : undefined,
        },
      };
    });

    const orderedTools = [...data.tools].sort((a, b) => {
      const laneCompare = getLanePosition(getToolLane(a), 0).x - getLanePosition(getToolLane(b), 0).x;
      if (laneCompare !== 0) return laneCompare;
      const orderCompare = getToolOrder(a) - getToolOrder(b);
      if (orderCompare !== 0) return orderCompare;
      return a.name.localeCompare(b.name);
    });

    const toolNodes = orderedTools.map((tool) => {
      const reviewCount = getToolReviewItems(tool, data).length;
      const lane = getToolLane(tool);
      const nodeId = `tool:${tool.id}`;
      const generatedPosition = getLanePosition(lane, laneIndexes[lane]++);
      return {
        id: nodeId,
        position: generatedPosition,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
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
          padding: 10,
          width: 210,
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
    data.relationships.forEach((relationship) => {
      const source = `${relationship.fromType}:${relationship.fromId}`;
      const target = `${relationship.toType}:${relationship.toId}`;

      if (source === focusedNodeId) {
        ids.add(target);
      } else if (target === focusedNodeId) {
        ids.add(source);
      }
    });

    return ids;
  }, [data.relationships, focusedNodeId]);

  const nodes = useMemo(() => {
    if (!focusedNodeIds) return filteredNodes;
    return applyFocusedGroupLayout(
      filteredNodes.filter((node) => focusedNodeIds.has(node.id)),
      data.relationships,
      focusedNodeId,
    );
  }, [data.relationships, filteredNodes, focusedNodeId, focusedNodeIds]);

  const visibleNodeIds = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes]);

  const edges = useMemo<Edge[]>(
    () => {
      if (focusedNodeId) {
        const focusedEdges: Edge[] = [];
        const connectedGroupIds = new Set<string>();
        const visibleNodeById = new Map(nodes.map((node) => [node.id, node]));

        data.relationships.forEach((relationship) => {
          const source = `${relationship.fromType}:${relationship.fromId}`;
          const target = `${relationship.toType}:${relationship.toId}`;
          const groupId = `relationship-group:${relationship.relationshipType}`;

          if (source !== focusedNodeId && target !== focusedNodeId) return;

          const otherNodeId = source === focusedNodeId ? target : source;
          if (!visibleNodeIds.has(otherNodeId)) return;
          const otherNode = visibleNodeById.get(otherNodeId);

          if (relationship.relationshipType === "uses" && otherNode?.data.lane === "Workspace") {
            focusedEdges.push({
              id: `${otherNodeId}->${focusedNodeId}`,
              source: otherNodeId,
              target: focusedNodeId,
              type: "smoothstep",
              animated: false,
              style: { stroke: "#334155", strokeWidth: 2.4 },
            });
            return;
          }

          if (!visibleNodeIds.has(groupId)) return;

          if (!connectedGroupIds.has(groupId)) {
            connectedGroupIds.add(groupId);
            focusedEdges.push({
              id: `${focusedNodeId}->${groupId}`,
              source: focusedNodeId,
              target: groupId,
              type: "smoothstep",
              animated: false,
              style: { stroke: "#334155", strokeWidth: 2.4 },
            });
          }

          focusedEdges.push({
            id: `${groupId}->${otherNodeId}`,
            source: groupId,
            target: otherNodeId,
            type: "smoothstep",
            animated: false,
            style: { stroke: "#64748b", strokeWidth: 1.8 },
          });
        });

        return focusedEdges;
      }

      return data.relationships
        .map((relationship) => {
          const source = `${relationship.fromType}:${relationship.fromId}`;
          const target = `${relationship.toType}:${relationship.toId}`;

          return {
            id: relationship.id,
            source,
            target,
            type: "smoothstep",
            label: getRelationshipLabel(relationship.relationshipType),
            animated: false,
            style: { stroke: "#475569", strokeWidth: 2 },
            labelStyle: { fill: "#334155", fontWeight: 700, fontSize: 12 },
            labelBgStyle: { fill: "#ffffff", fillOpacity: 0.95 },
          };
        })
        .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
        .filter((edge) => {
          if (!focusedNodeIds) return true;
          return focusedNodeIds.has(edge.source) && focusedNodeIds.has(edge.target);
        });
    },
    [data.relationships, focusedNodeId, focusedNodeIds, nodes, visibleNodeIds],
  );

  const reviewNodeCount = allNodes.filter((node) => node.data.reviewCount > 0).length;
  const focusedLabel = focusedNodeId
    ? allNodes.find((node) => node.id === focusedNodeId)?.data.label
    : "";
  const focusedRelationships = useMemo(() => {
    if (!focusedNodeId) return [];

    return data.relationships
      .filter((relationship) => {
        const source = `${relationship.fromType}:${relationship.fromId}`;
        const target = `${relationship.toType}:${relationship.toId}`;
        return source === focusedNodeId || target === focusedNodeId;
      })
      .map((relationship) => {
        const source = `${relationship.fromType}:${relationship.fromId}`;
        const isOutgoing = source === focusedNodeId;

        return {
          id: relationship.id,
          label: getRelationshipLabel(relationship.relationshipType),
          direction: isOutgoing ? "outgoing" : "incoming",
          fromName: getEntityName(data, relationship.fromType, relationship.fromId),
          toName: getEntityName(data, relationship.toType, relationship.toId),
          otherName: isOutgoing
            ? getEntityName(data, relationship.toType, relationship.toId)
            : getEntityName(data, relationship.fromType, relationship.fromId),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label) || a.otherName.localeCompare(b.otherName));
  }, [data, focusedNodeId]);

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
        className="h-full w-full"
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.18, minZoom: 0.4, maxZoom: 1 }}
        minZoom={0.25}
        maxZoom={1.4}
        onNodeClick={(_, node) => {
          if (node.data.kind === "Relationship") return;
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
          Focused on {focusedLabel}. {focusedRelationships.length} direct relationship
          {focusedRelationships.length === 1 ? "" : "s"} grouped by type.
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

  const focusedRelationshipsPanel = focusedNodeId ? (
    <div className="border-t border-slate-200 pt-4">
      <h3 className="text-sm font-semibold text-slate-950">Focused Relationships</h3>
      <div className="mt-3 space-y-2">
        {focusedRelationships.map((relationship) => (
          <div
            key={relationship.id}
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
          >
            <p className="font-semibold text-slate-900">
              {relationship.direction === "outgoing"
                ? `${focusedLabel} ${relationship.label} ${relationship.otherName}`
                : `${relationship.otherName} ${relationship.label} ${focusedLabel}`}
            </p>
            <p className="mt-1 text-slate-500">
              {relationship.fromName} -&gt; {relationship.toName}
            </p>
          </div>
        ))}
        {focusedRelationships.length === 0 ? (
          <p className="text-sm text-slate-500">No direct relationships.</p>
        ) : null}
      </div>
    </div>
  ) : null;

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
          {selected.href ? (
            <Link
              href={selected.href}
              className="inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Open details
            </Link>
          ) : null}
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
      {focusedNodeId ? (
        <div className="mt-4">{focusedRelationshipsPanel}</div>
      ) : (
        <div className="mt-4 space-y-2 text-xs text-slate-500">
          {data.relationships.slice(0, 5).map((relationship) => (
            <p key={relationship.id}>
              {getEntityName(data, relationship.fromType, relationship.fromId)}{" "}
              {getRelationshipLabel(relationship.relationshipType)}{" "}
              {getEntityName(data, relationship.toType, relationship.toId)}
            </p>
          ))}
        </div>
      )}
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
          <div className="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {renderFlowCanvas()}
          </div>
        </div>
      ) : null}
    </div>
  );
}
