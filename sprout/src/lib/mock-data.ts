import type { GraphNode } from "@/components/graph-node";

export type Branch = {
  id: string;
  title: string;
  userId: string;
};

const USER_ID = "user-1";

export const mockBranches: Branch[] = [
  { id: "branch-dsa", title: "Data Structures & Algorithms", userId: USER_ID },
  { id: "branch-sys", title: "Systems", userId: USER_ID },
  { id: "branch-math", title: "Discrete Math", userId: USER_ID },
];

export const mockNodes: GraphNode[] = [
  // ── Root ──────────────────────────────────────────────────
  {
    id: "root",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Computer Science",
      variant: "root",
      userId: USER_ID,
      branchId: null,
      parentId: null,
      completed: true,
    },
  },

  // ── Branch 1: Data Structures & Algorithms ────────────────
  // Concepts (linear chain)
  {
    id: "dsa-data-structures",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Data Structures",
      variant: "concept",
      userId: USER_ID,
      branchId: "branch-dsa",
      parentId: "root",
      completed: true,
    },
  },
  {
    id: "dsa-algorithms",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Algorithms",
      variant: "concept",
      userId: USER_ID,
      branchId: "branch-dsa",
      parentId: "dsa-data-structures",
      completed: true,
    },
  },
  {
    id: "dsa-complexity",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Complexity Analysis",
      variant: "concept",
      userId: USER_ID,
      branchId: "branch-dsa",
      parentId: "dsa-algorithms",
    },
  },

  // Subconcepts: Data Structures
  {
    id: "ds-arrays",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Arrays",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-dsa",
      parentId: "dsa-data-structures",
      completed: true,
    },
  },
  {
    id: "ds-linked-lists",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Linked Lists",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-dsa",
      parentId: "dsa-data-structures",
      completed: true,
    },
  },
  {
    id: "ds-trees",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Trees",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-dsa",
      parentId: "dsa-data-structures",
    },
  },

  // Subconcepts: Algorithms
  {
    id: "alg-sorting",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Sorting",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-dsa",
      parentId: "dsa-algorithms",
      completed: true,
    },
  },
  {
    id: "alg-searching",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Searching",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-dsa",
      parentId: "dsa-algorithms",
    },
  },

  // Subconcepts: Complexity
  {
    id: "cx-big-o",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Big-O Notation",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-dsa",
      parentId: "dsa-complexity",
    },
  },
  {
    id: "cx-space-time",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Space vs Time",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-dsa",
      parentId: "dsa-complexity",
    },
  },

  // ── Branch 2: Systems ─────────────────────────────────────
  // Concepts (linear chain)
  {
    id: "sys-os",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Operating Systems",
      variant: "concept",
      userId: USER_ID,
      branchId: "branch-sys",
      parentId: "root",
      completed: true,
    },
  },
  {
    id: "sys-networking",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Networking",
      variant: "concept",
      userId: USER_ID,
      branchId: "branch-sys",
      parentId: "sys-os",
    },
  },
  {
    id: "sys-databases",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Databases",
      variant: "concept",
      userId: USER_ID,
      branchId: "branch-sys",
      parentId: "sys-networking",
    },
  },

  // Subconcepts: Operating Systems
  {
    id: "os-processes",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Processes",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-sys",
      parentId: "sys-os",
      completed: true,
    },
  },
  {
    id: "os-threads",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Threads",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-sys",
      parentId: "sys-os",
    },
  },
  {
    id: "os-scheduling",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Scheduling",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-sys",
      parentId: "sys-os",
    },
  },

  // Subconcepts: Networking
  {
    id: "net-tcp-ip",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "TCP/IP",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-sys",
      parentId: "sys-networking",
    },
  },
  {
    id: "net-http",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "HTTP",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-sys",
      parentId: "sys-networking",
    },
  },
  {
    id: "net-dns",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "DNS",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-sys",
      parentId: "sys-networking",
    },
  },

  // Subconcepts: Databases
  {
    id: "db-sql",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "SQL",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-sys",
      parentId: "sys-databases",
    },
  },
  {
    id: "db-indexing",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Indexing",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-sys",
      parentId: "sys-databases",
    },
  },

  // ── Branch 3: Discrete Math ───────────────────────────────
  // Concepts (linear chain)
  {
    id: "math-sets-logic",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Sets & Logic",
      variant: "concept",
      userId: USER_ID,
      branchId: "branch-math",
      parentId: "root",
      completed: true,
    },
  },
  {
    id: "math-proofs",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Proofs",
      variant: "concept",
      userId: USER_ID,
      branchId: "branch-math",
      parentId: "math-sets-logic",
    },
  },
  {
    id: "math-graph-theory",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Graph Theory",
      variant: "concept",
      userId: USER_ID,
      branchId: "branch-math",
      parentId: "math-proofs",
    },
  },

  // Subconcepts: Sets & Logic
  {
    id: "sl-propositional",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Propositional Logic",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-math",
      parentId: "math-sets-logic",
      completed: true,
    },
  },
  {
    id: "sl-predicate",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Predicate Logic",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-math",
      parentId: "math-sets-logic",
    },
  },

  // Subconcepts: Proofs
  {
    id: "pf-induction",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Induction",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-math",
      parentId: "math-proofs",
    },
  },
  {
    id: "pf-contradiction",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Contradiction",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-math",
      parentId: "math-proofs",
    },
  },

  // Subconcepts: Graph Theory
  {
    id: "gt-trees",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Trees",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-math",
      parentId: "math-graph-theory",
    },
  },
  {
    id: "gt-traversals",
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: "Traversals",
      variant: "subconcept",
      userId: USER_ID,
      branchId: "branch-math",
      parentId: "math-graph-theory",
    },
  },
];
