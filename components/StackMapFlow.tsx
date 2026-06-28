"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Expand, RotateCcw, Shrink } from "lucide-react";
import {
  Background,
  Controls,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { RELATIONSHIP_TYPES } from "@/lib/constants";
import type { RelationshipType, StackMapData } from "@/lib/types";
import {
  cn,
  getEntityName,
  getProjectReviewItems,
  getRelationshipLabel,
  getToolReviewItems,
} from "@/lib/utils";

type MapFilter = "all" | "projects" | "tools" | "connected";

type MapNodeData = {
  label: string;
  kind: "Project" | "Tool" | "Relationship";
  meta: string;
  notes: string;
  href?: string;
  appStoreUrl?: string;
  googlePlayUrl?: string;
  attentionCount: number;
  lane: "Workspace" | "AI" | "Project" | "Support";
};

const filterOptions: Array<{ value: MapFilter; label: string }> = [
  { value: "projects", label: "Projects" },
  { value: "all", label: "All records" },
  { value: "tools", label: "Tools" },
  { value: "connected", label: "Connected" },
];

const workspaceToolNames = ["visual studio", "vs code", "xcode", "android studio", "cursor"];
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
  if (workspaceToolNames.some((n) => name.includes(n))) return "Workspace";
  if (tool.category === "AI" || aiToolNames.some((n) => name.includes(n))) return "AI";
  return "Support";
}

function getLanePosition(lane: MapNodeData["lane"], index: number) {
  const xByLane: Record<MapNodeData["lane"], number> = {
    Workspace: 0,
    Project: 270,
    AI: 540,
    Support: 810,
  };
  return { x: xByLane[lane], y: index * 96 };
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
  focusedIds: string[],
) {
  if (focusedIds.length === 0) return nodes;

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const focusedSet = new Set(focusedIds);

  const groups = new Map<string, Node<MapNodeData>[]>();
  const startNodeIds = new Set<string>();
  const startNodes: Node<MapNodeData>[] = [];

  relationships.forEach((relationship) => {
    const source = `${relationship.fromType}:${relationship.fromId}`;
    const target = `${relationship.toType}:${relationship.toId}`;
    const sourceIsFocused = focusedSet.has(source);
    const targetIsFocused = focusedSet.has(target);
    if (!sourceIsFocused && !targetIsFocused) return;
    if (sourceIsFocused && targetIsFocused) return;

    const otherNodeId = sourceIsFocused ? target : source;
    const otherNode = nodeById.get(otherNodeId);
    if (!otherNode) return;

    if (relationship.relationshipType === "uses" && otherNode.data.lane === "Workspace") {
      if (!startNodeIds.has(otherNode.id)) {
        startNodeIds.add(otherNode.id);
        startNodes.push(otherNode);
      }
      return;
    }

    const existing = groups.get(relationship.relationshipType) ?? [];
    if (!existing.some((n) => n.id === otherNode.id)) {
      groups.set(relationship.relationshipType, [...existing, otherNode]);
    }
  });

  const groupEntries = Array.from(groups.entries())
    .map(
      ([type, groupNodes]) =>
        [type, [...groupNodes].sort((a, b) => a.data.label.localeCompare(b.data.label))] as const,
    )
    .sort(([a], [b]) => getRelationshipOrder(a) - getRelationshipOrder(b) || a.localeCompare(b));

  const relatedYStep = 106;
  const groupGap = 54;
  const isSingle = focusedIds.length === 1;
  const focusedAreTool = focusedIds.every((id) => id.startsWith("tool:"));

  // When a tool is focused, flip the layout so projects always appear on the left.
  const startX = isSingle ? 0 : -330;
  const focusedX = focusedAreTool ? (isSingle ? 660 : 330) : (isSingle ? 300 : 0);
  const groupX = focusedAreTool ? (isSingle ? 330 : 0) : (isSingle ? 630 : 330);
  const relatedX = focusedAreTool ? (isSingle ? 0 : -330) : (isSingle ? 960 : 660);

  const groupNodes: Node<MapNodeData>[] = [];
  const positionedRelatedNodes: Node<MapNodeData>[] = [];
  let y = 0;

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
        attentionCount: 0,
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

  const totalHeight = Math.max(relatedYStep, y - groupGap);
  const midY = totalHeight / 2;

  const focusedNodes = focusedIds
    .map((id) => nodeById.get(id))
    .filter((n): n is Node<MapNodeData> => Boolean(n));

  const positionedFocusedNodes = focusedNodes.map((node, index, list) => ({
    ...node,
    position: {
      x: focusedX,
      y: midY - ((list.length - 1) * relatedYStep) / 2 + index * relatedYStep,
    },
  }));

  const focusMidY =
    positionedFocusedNodes.length > 0
      ? positionedFocusedNodes[Math.floor(positionedFocusedNodes.length / 2)].position.y
      : midY;

  const positionedStartNodes = [...startNodes]
    .sort((a, b) => a.data.label.localeCompare(b.data.label))
    .map((node, index, list) => ({
      ...node,
      position: {
        x: startX,
        y: focusMidY - ((list.length - 1) * relatedYStep) / 2 + index * relatedYStep,
      },
    }));

  return [...positionedStartNodes, ...positionedFocusedNodes, ...groupNodes, ...positionedRelatedNodes];
}

// ─── Inner component (has access to useReactFlow) ─────────────────────────────

function StackMapFlowContent({ data }: { data: StackMapData }) {
  const { fitView, setCenter } = useReactFlow();
  const [selected, setSelected] = useState<MapNodeData | null>(null);
  const [focusedProjectIds, setFocusedProjectIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<MapFilter>("projects");
  const [relTypeFilter, setRelTypeFilter] = useState<RelationshipType | "all">("all");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [tooltipNotes, setTooltipNotes] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  function handleCanvasMouseMove(event: React.MouseEvent) {
    if (tooltipRef.current && tooltipNotes) {
      tooltipRef.current.style.left = `${event.clientX + 14}px`;
      tooltipRef.current.style.top = `${event.clientY - 10}px`;
    }
  }

  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    data.relationships.forEach((r) => {
      ids.add(`${r.fromType}:${r.fromId}`);
      ids.add(`${r.toType}:${r.toId}`);
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
      const attentionCount = getProjectReviewItems(project, data).length;
      const lane = "Project" as const;
      const nodeId = `project:${project.id}`;
      return {
        id: nodeId,
        position: getLanePosition(lane, laneIndexes[lane]++),
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: project.name,
          kind: "Project" as const,
          meta: `${project.type} / ${project.status}`,
          notes: project.notes,
          href: `/projects/${project.id}`,
          appStoreUrl: project.appStoreUrl,
          googlePlayUrl: project.googlePlayUrl,
          attentionCount,
          lane,
        },
        style: {
          border: "1px solid #0891b2",
          background: "#ecfeff",
          color: "#164e63",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: 700,
          padding: 12,
          width: 240,
        },
      };
    });

    const orderedTools = [...data.tools].sort((a, b) => {
      const laneCompare =
        getLanePosition(getToolLane(a), 0).x - getLanePosition(getToolLane(b), 0).x;
      if (laneCompare !== 0) return laneCompare;
      const orderCompare = getToolOrder(a) - getToolOrder(b);
      if (orderCompare !== 0) return orderCompare;
      return a.name.localeCompare(b.name);
    });

    const toolNodes = orderedTools.map((tool) => {
      const attentionCount = getToolReviewItems(tool, data).length;
      const lane = getToolLane(tool);
      return {
        id: `tool:${tool.id}`,
        position: getLanePosition(lane, laneIndexes[lane]++),
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: tool.name,
          kind: "Tool" as const,
          meta: `${tool.category} / ${tool.status}`,
          notes: tool.notes,
          href: `/tools/${tool.id}`,
          attentionCount,
          lane,
        },
        style: {
          border: "1px solid #d97706",
          background: lane === "AI" ? "#f5f3ff" : "#fffbeb",
          color: lane === "AI" ? "#4c1d95" : "#78350f",
          borderRadius: 8,
          cursor: "pointer",
          padding: 10,
          width: 210,
        },
      };
    });

    return [...projectNodes, ...toolNodes];
  }, [data]);

  const relTypeConnectedIds = useMemo(() => {
    if (relTypeFilter === "all") return null;
    const ids = new Set<string>();
    data.relationships
      .filter((r) => r.relationshipType === relTypeFilter)
      .forEach((r) => {
        ids.add(`${r.fromType}:${r.fromId}`);
        ids.add(`${r.toType}:${r.toId}`);
      });
    return ids;
  }, [data.relationships, relTypeFilter]);

  const filteredNodes = useMemo(() => {
    return allNodes
      .filter((node) => {
        if (focusedProjectIds.length > 0) return true;
        if (filter === "projects") return node.data.kind === "Project";
        if (filter === "all") return true;
        if (filter === "tools") return node.data.kind === "Tool";
        if (filter === "connected") return connectedIds.has(node.id);
        return node.data.kind === "Project";
      })
      .filter((node) => !relTypeConnectedIds || relTypeConnectedIds.has(node.id));
  }, [allNodes, connectedIds, filter, focusedProjectIds, relTypeConnectedIds]);

  const focusedRelatedIds = useMemo(() => {
    if (focusedProjectIds.length === 0) return null;
    const ids = new Set(focusedProjectIds);
    data.relationships.forEach((r) => {
      const source = `${r.fromType}:${r.fromId}`;
      const target = `${r.toType}:${r.toId}`;
      if (focusedProjectIds.includes(source)) ids.add(target);
      else if (focusedProjectIds.includes(target)) ids.add(source);
    });
    return ids;
  }, [data.relationships, focusedProjectIds]);

  const nodes = useMemo(() => {
    if (!focusedRelatedIds) return filteredNodes;
    return applyFocusedGroupLayout(
      filteredNodes.filter((node) => focusedRelatedIds.has(node.id)),
      data.relationships,
      focusedProjectIds,
    );
  }, [data.relationships, filteredNodes, focusedProjectIds, focusedRelatedIds]);

  const visibleNodeIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);

  const edges = useMemo<Edge[]>(() => {
    if (focusedProjectIds.length > 0) {
      const focusedEdges: Edge[] = [];
      const drawnEdgeIds = new Set<string>();
      const visibleNodeById = new Map(nodes.map((n) => [n.id, n]));
      const focusedSet = new Set(focusedProjectIds);

      const focusedAreTool = focusedProjectIds.every((id) => id.startsWith("tool:"));

      data.relationships.forEach((r) => {
        const source = `${r.fromType}:${r.fromId}`;
        const target = `${r.toType}:${r.toId}`;
        const groupId = `relationship-group:${r.relationshipType}`;
        const sourceIsFocused = focusedSet.has(source);
        const targetIsFocused = focusedSet.has(target);
        if (!sourceIsFocused && !targetIsFocused) return;
        if (sourceIsFocused && targetIsFocused) return;

        const focusedNodeId = sourceIsFocused ? source : target;
        const otherNodeId = sourceIsFocused ? target : source;
        if (!visibleNodeIds.has(otherNodeId)) return;
        const otherNode = visibleNodeById.get(otherNodeId);

        if (r.relationshipType === "uses" && otherNode?.data.lane === "Workspace") {
          const id = `${otherNodeId}->${focusedNodeId}`;
          if (!drawnEdgeIds.has(id)) {
            drawnEdgeIds.add(id);
            focusedEdges.push({ id, source: otherNodeId, target: focusedNodeId, type: "smoothstep", animated: false, style: { stroke: "#334155", strokeWidth: 2.4 } });
          }
          return;
        }

        if (!visibleNodeIds.has(groupId)) return;

        // When a tool is focused, projects are on the left — edges flow left to right:
        // project → group → tool. When a project is focused, it's the reverse side
        // that fans out, so: project → group → related tool (same visual direction).
        const leftNodeId = focusedAreTool ? otherNodeId : focusedNodeId;
        const rightNodeId = focusedAreTool ? focusedNodeId : otherNodeId;

        const pgId = `${leftNodeId}->${groupId}`;
        if (!drawnEdgeIds.has(pgId)) {
          drawnEdgeIds.add(pgId);
          focusedEdges.push({ id: pgId, source: leftNodeId, target: groupId, type: "smoothstep", animated: false, style: { stroke: "#334155", strokeWidth: 2.4 } });
        }

        const gtId = `${groupId}->${rightNodeId}`;
        if (!drawnEdgeIds.has(gtId)) {
          drawnEdgeIds.add(gtId);
          focusedEdges.push({ id: gtId, source: groupId, target: rightNodeId, type: "smoothstep", animated: false, style: { stroke: "#64748b", strokeWidth: 1.8 } });
        }
      });

      return focusedEdges;
    }

    if (filter === "all") return [];

    return data.relationships
      .filter((r) => relTypeFilter === "all" || r.relationshipType === relTypeFilter)
      .map((r) => ({
        id: r.id,
        source: `${r.fromType}:${r.fromId}`,
        target: `${r.toType}:${r.toId}`,
        type: "default",
        animated: false,
        style: { stroke: "#475569", strokeWidth: 2 },
      }))
      .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [data.relationships, filter, focusedProjectIds, nodes, relTypeFilter, visibleNodeIds]);

  // Fit view whenever the layout changes meaningfully — but don't use `key` to remount,
  // so the user's pan/zoom is preserved between minor interactions.
  const nodeLayoutKey = nodes
    .map((node) => `${node.id}:${node.position.x}:${node.position.y}`)
    .join("|");
  const fitViewTrigger = `${filter}|${relTypeFilter}|${focusedProjectIds.join(",")}|${nodeLayoutKey}`;
  const prevTriggerRef = useRef<string>("");
  useEffect(() => {
    if (prevTriggerRef.current === fitViewTrigger) return;
    prevTriggerRef.current = fitViewTrigger;
    const id = window.requestAnimationFrame(() => {
      if (filter === "projects" && focusedProjectIds.length === 0 && nodes.length > 0) {
        const minX = Math.min(...nodes.map((node) => node.position.x));
        const maxX = Math.max(...nodes.map((node) => node.position.x + 240));
        const minY = Math.min(...nodes.map((node) => node.position.y));
        const maxY = Math.max(...nodes.map((node) => node.position.y + 52));
        setCenter((minX + maxX) / 2, (minY + maxY) / 2, {
          zoom: 1,
          duration: 250,
        });
        return;
      }
      fitView({ padding: 0.18, minZoom: 0.25, maxZoom: 1 });
    });
    return () => window.cancelAnimationFrame(id);
  }, [filter, fitView, fitViewTrigger, focusedProjectIds.length, nodes, setCenter]);

  const focusedLabel =
    focusedProjectIds.length === 1
      ? (allNodes.find((n) => n.id === focusedProjectIds[0])?.data.label ?? "")
      : focusedProjectIds.length > 1
        ? `${focusedProjectIds.length} projects`
        : "";

  const focusedRelationships = useMemo(() => {
    const primaryId = focusedProjectIds[0];
    if (!primaryId) return [];
    return data.relationships
      .filter((r) => {
        const source = `${r.fromType}:${r.fromId}`;
        const target = `${r.toType}:${r.toId}`;
        return source === primaryId || target === primaryId;
      })
      .map((r) => {
        const source = `${r.fromType}:${r.fromId}`;
        const isOutgoing = source === primaryId;
        const primaryLabel = allNodes.find((n) => n.id === primaryId)?.data.label ?? "";
        return {
          id: r.id,
          label: getRelationshipLabel(r.relationshipType),
          direction: isOutgoing ? "outgoing" : "incoming",
          fromName: getEntityName(data, r.fromType, r.fromId),
          toName: getEntityName(data, r.toType, r.toId),
          otherName: isOutgoing
            ? getEntityName(data, r.toType, r.toId)
            : getEntityName(data, r.fromType, r.fromId),
          primaryLabel,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label) || a.otherName.localeCompare(b.otherName));
  }, [allNodes, data, focusedProjectIds]);

  function changeFilter(nextFilter: MapFilter) {
    setFilter(nextFilter);
    setRelTypeFilter("all");
    setFocusedProjectIds([]);
    setSelected(null);
  }

  function clearFocus() {
    setFocusedProjectIds([]);
    setSelected(null);
  }

  function showProjects() {
    setFilter("projects");
    setRelTypeFilter("all");
    clearFocus();
  }

  function resetMap() {
    showProjects();
  }

  const filterPanel = (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-xs sm:text-sm">
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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => changeFilter(option.value)}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-medium",
                filter === option.value
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100",
              )}
            >
              {option.label}
            </button>
          ))}
          {focusedProjectIds.length === 0 && filter !== "projects" && (
            <select
              value={relTypeFilter}
              onChange={(e) => {
                setRelTypeFilter(e.target.value as RelationshipType | "all");
                setFocusedProjectIds([]);
                setSelected(null);
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <option value="all">All relationships</option>
              {RELATIONSHIP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {getRelationshipLabel(type)}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={resetMap}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset map
          </button>
          <button
            type="button"
            onClick={() => setIsFullScreen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            {isFullScreen ? (
              <Shrink className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Expand className="h-4 w-4" aria-hidden="true" />
            )}
            {isFullScreen ? "Exit focus mode" : "Focus mode"}
          </button>
        </div>
      </div>

      {focusedProjectIds.length === 0 && filter === "projects" ? (
        <p className="mt-3 rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800">
          Click any project to map its tools and relationships.{" "}
          Hold{" "}
          <kbd className="rounded border border-indigo-200 bg-white px-1 py-0.5 font-mono text-xs">
            Ctrl
          </kbd>{" "}
          and click to select multiple projects.
        </p>
      ) : focusedProjectIds.length > 0 ? (
        <p className="mt-4 rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700">
          Focused on {focusedLabel}. {focusedRelationships.length} direct relationship
          {focusedRelationships.length === 1 ? "" : "s"} grouped by type.
          {focusedProjectIds.length === 1
            ? " Ctrl+click another project to add it."
            : " Click any project alone to reset."}
        </p>
      ) : null}

      <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
        <p>{nodes.length} visible nodes</p>
        <p>{edges.length} visible edges</p>
        <p>{connectedIds.size} connected records</p>
      </div>
    </section>
  );

  const selectedSummary = focusedProjectIds.length > 0 && selected ? (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
          {selected.kind}
        </p>
        <h2 className="text-lg font-semibold text-slate-950">{selected.label}</h2>
        <p className="mt-1 text-sm text-indigo-900">
          {focusedRelationships.length} direct relationship
          {focusedRelationships.length === 1 ? "" : "s"} grouped by type on the map.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {selected.appStoreUrl ? (
          <a href={selected.appStoreUrl} target="_blank" rel="noreferrer" className="inline-flex items-center">
            <img src="/badges/app-store.svg" alt="Download on the App Store" className="h-10" />
          </a>
        ) : null}
        {selected.googlePlayUrl ? (
          <a href={selected.googlePlayUrl} target="_blank" rel="noreferrer" className="inline-flex items-center">
            <img src="/badges/google-play.png" alt="Get it on Google Play" className="h-10" />
          </a>
        ) : null}
        {selected.href ? (
          <Link
            href={selected.href}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Open {selected.kind.toLowerCase()}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={showProjects}
          className="rounded-md border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
        >
          Show projects
        </button>
      </div>
    </section>
  ) : null;

  const canvas = (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      panOnDrag
      zoomOnScroll
      zoomOnPinch
      minZoom={0.15}
      maxZoom={1.4}
      onNodeClick={(event, node) => {
        if (node.data.kind === "Relationship") return;
        setSelected(node.data);
        if (event.ctrlKey || event.metaKey) {
          setFocusedProjectIds((current) =>
            current.includes(node.id)
              ? current.filter((id) => id !== node.id)
              : [...current, node.id],
          );
        } else {
          setFocusedProjectIds([node.id]);
        }
      }}
      onNodeMouseEnter={(event, node) => {
        if (!node.data.notes || node.data.kind === "Relationship") return;
        setTooltipNotes(node.data.notes);
        if (tooltipRef.current) {
          tooltipRef.current.style.left = `${event.clientX + 14}px`;
          tooltipRef.current.style.top = `${event.clientY - 10}px`;
        }
      }}
      onNodeMouseLeave={() => setTooltipNotes(null)}
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );

  const tooltipOverlay = tooltipNotes ? (
    <div
      ref={tooltipRef}
      className="fixed z-[100] max-w-xs pointer-events-none rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-sm text-slate-700 whitespace-pre-wrap"
      style={{ left: 0, top: 0 }}
    >
      {tooltipNotes}
    </div>
  ) : null;

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col gap-3 overflow-auto bg-slate-50 p-4" onMouseMove={handleCanvasMouseMove}>
        {filterPanel}
        {selectedSummary}
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {canvas}
        </div>
        {tooltipOverlay}
      </div>
    );
  }

  return (
    <div className="space-y-4" onMouseMove={handleCanvasMouseMove}>
      {filterPanel}
      {selectedSummary}
      <div className="h-[calc(100vh-18rem)] min-h-[620px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {canvas}
      </div>
      {tooltipOverlay}
    </div>
  );
}

// ─── Public export (wraps with provider) ──────────────────────────────────────

export function StackMapFlow({ data }: { data: StackMapData }) {
  return (
    <ReactFlowProvider>
      <StackMapFlowContent data={data} />
    </ReactFlowProvider>
  );
}
