"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { type GraphNode, graphNodeTypes } from "@/components/graph-node";
import { buildEdgesFromNodes } from "@/lib/graph-utils";
import { getLayoutedElements } from "@/lib/layout";
import { mockNodes } from "@/lib/mock-data";

const edgeStyle = {
  stroke: "#2A6B30",
  strokeWidth: 1.5,
  strokeDasharray: "6,4",
};

// Derive edges from parentId relationships
const initialEdges = buildEdgesFromNodes(mockNodes);

// Derive frontier: edges from completed → not-completed nodes
const nodeCompletionMap = new Map(
  mockNodes.map((n) => [n.id, !!n.data.completed]),
);

const nextNodeIds = new Set(
  initialEdges
    .filter(
      (e) =>
        nodeCompletionMap.get(e.source) && !nodeCompletionMap.get(e.target),
    )
    .map((e) => e.target),
);

const styledEdges = initialEdges.map((edge) => {
  const isFrontier =
    nodeCompletionMap.get(edge.source) && !nodeCompletionMap.get(edge.target);
  return { ...edge, style: edgeStyle, animated: isFrontier };
});

const nodesWithNext = mockNodes.map((node) =>
  nextNodeIds.has(node.id)
    ? { ...node, data: { ...node.data, next: true } }
    : node,
);

const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
  nodesWithNext,
  styledEdges,
);

function minimapNodeColor(node: GraphNode): string {
  if (node.data?.completed) return "#2EE84A";
  switch (node.data?.variant) {
    case "root":
      return "#2EE84A";
    case "concept":
      return "#1A4D20";
    case "subconcept":
      return "#00FF41";
    default:
      return "#1A4D20";
  }
}

export default function GraphCanvas() {
  const [nodes, , onNodesChange] = useNodesState(layoutedNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutedEdges);

  return (
    <div className="h-screen w-screen bg-[#0A1A0F]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={graphNodeTypes}
        colorMode="dark"
        fitView
      >
        <Background color="rgba(46, 232, 74, 0.08)" gap={24} size={1.5}/>
        <Controls
          style={{
            borderRadius: "8px",
            overflow: "hidden",
            border: "1px solid #1E3D24",
          }}
        />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor="rgba(10, 26, 15, 0.7)"
          style={{
            backgroundColor: "#0D2010",
            border: "1px solid #1E3D24",
            borderRadius: "8px",
          }}
        />
      </ReactFlow>
    </div>
  );
}
