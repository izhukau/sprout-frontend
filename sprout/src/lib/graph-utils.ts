import type { Edge } from "@xyflow/react";
import type { GraphNode } from "@/components/graph-node";

export function buildEdgesFromNodes(nodes: GraphNode[]): Edge[] {
  return nodes
    .filter(
      (n): n is GraphNode & { data: { parentId: string } } =>
        n.data.parentId !== null,
    )
    .map((n) => ({
      id: `e-${n.data.parentId}-${n.id}`,
      source: n.data.parentId,
      target: n.id,
    }));
}
