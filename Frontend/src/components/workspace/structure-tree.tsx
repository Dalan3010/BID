"use client";

import { isFilled, layoutGraph, type IdeaGraph, type NodeType } from "@bid/core";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";

import { cn } from "@/lib/cn";
import { DIMENSIONS, STATUS_LABEL, type DimensionStatus } from "@/lib/dimensions";

/**
 * The technical structure: the idea as the hierarchy `NODE_PARENT` defines.
 *
 * Positions come from the pure projection `layoutGraph` in `@bid/core`, so
 * the tree can never disagree with the plan. It is read-only and secondary:
 * the workspace loads it only when the user opens "Ver estructura técnica".
 *
 * An open dimension has a dashed border; a validated one, a solid border.
 */

interface DimensionNodeData extends Record<string, unknown> {
  type: NodeType;
  status: DimensionStatus;
  excerpt: string | null;
}

type DimensionFlowNode = Node<DimensionNodeData, "dimension">;

function DimensionNode({ data }: NodeProps<DimensionFlowNode>) {
  return (
    <div
      className={cn(
        "w-[220px] bg-ink-900 px-4 py-3 text-left",
        data.status === "validated" && "border border-sage/70",
        data.status === "pending" && "border border-dashed border-amber/70",
        data.status === "open" && "border border-dashed border-line-strong",
      )}
    >
      <Handle type="target" position={Position.Top} className="size-1.5! border-0! bg-stone!" />
      <p className="eyebrow mb-1.5 text-stone">{STATUS_LABEL[data.status]}</p>
      <p className="font-serif text-lg leading-tight text-paper">{DIMENSIONS[data.type].label}</p>
      {data.excerpt ? (
        <p className="mt-1.5 line-clamp-2 text-[0.6875rem] leading-snug text-mist">{data.excerpt}</p>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="size-1.5! border-0! bg-stone!" />
    </div>
  );
}

const NODE_TYPES_MAP = { dimension: DimensionNode };

export default function StructureTree({
  graph,
  heightClassName = "h-[26rem]",
}: {
  graph: IdeaGraph;
  /**
   * How tall the diagram is. The panel has a fixed, modest height; "Ampliar"
   * gives it the screen, because a hierarchy of ten dimensions does not fit in
   * 26rem and the person cannot read it.
   */
  heightClassName?: string;
}) {
  const { nodes, edges } = useMemo(() => {
    const layout = layoutGraph(graph);

    const flowNodes: DimensionFlowNode[] = layout.nodes.map((dimension) => {
      const validated = dimension.nodes.filter(isFilled);
      const status: DimensionStatus =
        validated.length > 0 ? "validated" : dimension.nodes.length > 0 ? "pending" : "open";

      return {
        id: dimension.type,
        type: "dimension",
        position: dimension.position,
        draggable: false,
        connectable: false,
        data: {
          type: dimension.type,
          status,
          excerpt: validated[0]?.content ?? null,
        },
      };
    });

    const flowEdges: Edge[] = layout.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      style: { stroke: "rgba(229,224,214,0.22)", strokeWidth: 1 },
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }, [graph]);

  return (
    <div className={cn("bid-flow border border-line bg-ink-950", heightClassName)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES_MAP}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        colorMode="dark"
        minZoom={0.2}
        proOptions={{ hideAttribution: false }}
        aria-label="Árbol de dimensiones de la idea"
      >
        <Background color="rgba(229,224,214,0.06)" gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
