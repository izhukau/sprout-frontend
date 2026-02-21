import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { cva } from "class-variance-authority";
import { BookOpen, Crosshair, ListOrdered, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

type NodeVariant = "problem" | "step" | "prereq" | "practice";

type GraphNodeData = {
  label: string;
  variant: NodeVariant;
};

export type GraphNode = Node<GraphNodeData, "graph">;

const nodeVariants = cva(
  [
    "flex items-center gap-3 rounded-lg border px-4 py-3",
    "bg-card text-card-foreground shadow-sm",
    "font-sans text-sm leading-tight",
  ],
  {
    variants: {
      variant: {
        problem: "border-primary/50 bg-primary/5 shadow-md",
        step: "border-border bg-card",
        prereq: "border-muted-foreground/20 bg-muted/50",
        practice: "border-chart-2/40 bg-chart-2/5",
      },
    },
    defaultVariants: {
      variant: "step",
    },
  },
);

const iconMap: Record<
  NodeVariant,
  { icon: React.ElementType; className: string }
> = {
  problem: { icon: Crosshair, className: "text-primary" },
  step: { icon: ListOrdered, className: "text-muted-foreground" },
  prereq: { icon: BookOpen, className: "text-muted-foreground" },
  practice: { icon: PenLine, className: "text-chart-2" },
};

function GraphNodeComponent({ data, selected }: NodeProps<GraphNode>) {
  const { label, variant } = data;
  const { icon: Icon, className: iconClassName } = iconMap[variant];

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!border-border !bg-muted-foreground !h-2 !w-2"
      />
      <div
        className={cn(
          nodeVariants({ variant }),
          selected && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", iconClassName)} />
        <span className="min-w-0">{label}</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!border-border !bg-muted-foreground !h-2 !w-2"
      />
    </>
  );
}

const MemoizedGraphNode = memo(GraphNodeComponent);

export const graphNodeTypes = {
  graph: MemoizedGraphNode,
} as const;
