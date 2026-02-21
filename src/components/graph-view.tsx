"use client";

import type { Edge } from "@xyflow/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ForceGraphView } from "@/components/force-graph-view";
import GraphCanvas from "@/components/graph-canvas";
import type { GraphNode, NodeVariant } from "@/components/graph-node";
import { GraphSidebar, type GraphView } from "@/components/graph-sidebar";
import { useAuth } from "@/hooks/use-auth";
import {
  type BackendBranch,
  type BackendEdge,
  type BackendNode,
  type BackendProgress,
  createBranch,
  createNode,
  createUser,
  DEFAULT_BRANCH_TITLES,
  generateSubconcepts,
  getUser,
  listBranches,
  listDependencyEdges,
  listNodes,
  listProgress,
  runTopicAgent,
} from "@/lib/backend-api";
import {
  getConceptNodesForBranch,
  getSubconceptNodesForConcept,
} from "@/lib/graph-utils";

const USER_ID_STORAGE_KEY = "sprout_user_id";

function nodeVariantFromType(type: BackendNode["type"]): NodeVariant {
  return type;
}

function buildCompletedSet(progressRows: BackendProgress[]): Set<string> {
  return new Set(
    progressRows
      .filter((row) => !!row.completedAt || row.masteryScore >= 0.7)
      .map((row) => row.nodeId),
  );
}

function mapBackendNodesToGraphNodes(
  backendNodes: BackendNode[],
  completedSet: Set<string>,
): GraphNode[] {
  return backendNodes.map((node) => ({
    id: node.id,
    type: "graph",
    position: { x: 0, y: 0 },
    data: {
      label: node.title,
      variant: nodeVariantFromType(node.type),
      userId: node.userId,
      branchId: node.branchId,
      parentId: node.parentId,
      completed: node.type === "root" ? true : completedSet.has(node.id),
      summary: node.desc ?? undefined,
    },
  }));
}

function toReactFlowEdges(edges: BackendEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
  }));
}

function buildLinearFallbackEdges(nodes: GraphNode[]): Edge[] {
  const sorted = [...nodes];
  return sorted.slice(0, -1).map((node, index) => ({
    id: `fallback-${node.id}-${sorted[index + 1].id}`,
    source: node.id,
    target: sorted[index + 1].id,
  }));
}

function isStructuralEdge(edge: Edge): boolean {
  return Boolean(
    (edge.data as { isStructural?: boolean } | undefined)?.isStructural,
  );
}

function buildLockedNodeIds(nodes: GraphNode[], edges: Edge[]): Set<string> {
  const completedById = new Map(
    nodes.map((node) => [node.id, !!node.data.completed]),
  );
  const nodeIdSet = new Set(nodes.map((node) => node.id));
  const incomingByTarget = new Map<string, string[]>();

  for (const edge of edges) {
    if (isStructuralEdge(edge)) continue;
    if (!nodeIdSet.has(edge.source) || !nodeIdSet.has(edge.target)) continue;
    const incoming = incomingByTarget.get(edge.target) ?? [];
    incoming.push(edge.source);
    incomingByTarget.set(edge.target, incoming);
  }

  const locked = new Set<string>();
  for (const node of nodes) {
    if (node.data.completed) continue;
    const parents = incomingByTarget.get(node.id) ?? [];
    if (!parents.length) continue;

    const allParentsCompleted = parents.every(
      (parentId) => completedById.get(parentId) === true,
    );
    if (!allParentsCompleted) {
      locked.add(node.id);
    }
  }

  return locked;
}

function applyLockedState(nodes: GraphNode[], edges: Edge[]): GraphNode[] {
  const lockedNodeIds = buildLockedNodeIds(nodes, edges);
  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      locked: lockedNodeIds.has(node.id),
    },
  }));
}

async function resolveFrontendUserId(preferredUserId?: string | null) {
  if (preferredUserId) {
    try {
      await getUser(preferredUserId);
      if (typeof window !== "undefined") {
        localStorage.setItem(USER_ID_STORAGE_KEY, preferredUserId);
      }
      return preferredUserId;
    } catch {
      // Fall through to stored/local creation flow
    }
  }

  if (typeof window !== "undefined") {
    const storedUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (storedUserId) {
      try {
        await getUser(storedUserId);
        return storedUserId;
      } catch {
        localStorage.removeItem(USER_ID_STORAGE_KEY);
      }
    }
  }

  const created = await createUser({
    email: `demo-${Date.now()}-${Math.floor(Math.random() * 1000)}@sprout.local`,
    title: "Demo learner",
  });

  if (typeof window !== "undefined") {
    localStorage.setItem(USER_ID_STORAGE_KEY, created.id);
  }

  return created.id;
}

export function GraphViewContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const userIdFromQuery = searchParams.get("userId");
  const branchIdFromQuery = searchParams.get("branchId");
  const conceptIdFromQuery = searchParams.get("conceptId");

  const [view, setView] = useState<GraphView>({ level: "global" });
  const [highlightedBranchId, setHighlightedBranchId] = useState<string | null>(
    null,
  );
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  const [branches, setBranches] = useState<BackendBranch[]>([]);
  const [backendNodes, setBackendNodes] = useState<BackendNode[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [conceptEdgesByRootId, setConceptEdgesByRootId] = useState<
    Record<string, BackendEdge[]>
  >({});
  const [subconceptEdgesByConceptId, setSubconceptEdgesByConceptId] = useState<
    Record<string, BackendEdge[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const branchRootByBranchId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const node of backendNodes) {
      if (node.type === "root" && node.branchId) {
        map[node.branchId] = node.id;
      }
    }
    return map;
  }, [backendNodes]);

  const refreshGraph = useCallback(async (userId: string) => {
    const [nodesRows, progressRows] = await Promise.all([
      listNodes({ userId }),
      listProgress(userId),
    ]);
    const completedSet = buildCompletedSet(progressRows);
    setBackendNodes(nodesRows);
    setGraphNodes(mapBackendNodesToGraphNodes(nodesRows, completedSet));
    return nodesRows;
  }, []);

  const loadConceptEdgesForBranch = useCallback(
    async (branchId: string, nodesSnapshot: BackendNode[]) => {
      const rootNode = nodesSnapshot.find(
        (node) => node.type === "root" && node.branchId === branchId,
      );
      if (!rootNode) return [];

      const edges = await listDependencyEdges(rootNode.id, "concept");
      setConceptEdgesByRootId((prev) => ({ ...prev, [rootNode.id]: edges }));
      return edges;
    },
    [],
  );

  const loadSubconceptEdgesForConcept = useCallback(
    async (conceptId: string) => {
      const edges = await listDependencyEdges(conceptId, "subconcept");
      setSubconceptEdgesByConceptId((prev) => ({
        ...prev,
        [conceptId]: edges,
      }));
      return edges;
    },
    [],
  );

  useEffect(() => {
    let isCancelled = false;

    const bootstrap = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userId = await resolveFrontendUserId(
          userIdFromQuery ?? user?.id ?? null,
        );
        if (isCancelled) return;

        setActiveUserId(userId);

        let branchRows = await listBranches(userId);
        if (!branchRows.length) {
          await Promise.all(
            DEFAULT_BRANCH_TITLES.map((title) =>
              createBranch({ userId, title }),
            ),
          );
          branchRows = await listBranches(userId);
        }
        if (isCancelled) return;

        setBranches(branchRows);

        let nodesRows = await refreshGraph(userId);
        const hasRootByBranch = new Set(
          nodesRows
            .filter((node) => node.type === "root" && !!node.branchId)
            .map((node) => node.branchId as string),
        );

        const missingRoots = branchRows.filter(
          (branch) => !hasRootByBranch.has(branch.id),
        );
        if (missingRoots.length) {
          await Promise.all(
            missingRoots.map((branch) =>
              createNode({
                userId,
                type: "root",
                branchId: branch.id,
                parentId: null,
                title: branch.title,
              }),
            ),
          );
          nodesRows = await refreshGraph(userId);
        }

        if (isCancelled) return;

        const roots = nodesRows.filter((node) => node.type === "root");
        await Promise.all(
          roots
            .filter((root) => root.branchId)
            .map((root) =>
              loadConceptEdgesForBranch(root.branchId as string, nodesRows),
            ),
        );

        if (branchIdFromQuery) {
          const hasBranch = branchRows.some(
            (branch) => branch.id === branchIdFromQuery,
          );
          if (hasBranch) {
            setHighlightedBranchId(branchIdFromQuery);

            if (conceptIdFromQuery) {
              const conceptNode = nodesRows.find(
                (node) =>
                  node.id === conceptIdFromQuery &&
                  node.type === "concept" &&
                  node.branchId === branchIdFromQuery,
              );

              if (conceptNode) {
                setView({
                  level: "concept",
                  branchId: branchIdFromQuery,
                  conceptId: conceptIdFromQuery,
                });
                await loadSubconceptEdgesForConcept(conceptIdFromQuery);
              } else {
                setView({ level: "branch", branchId: branchIdFromQuery });
              }
            } else {
              setView({ level: "branch", branchId: branchIdFromQuery });
            }
          }
        }
      } catch (e) {
        if (!isCancelled) {
          setError(e instanceof Error ? e.message : "Failed to load graph");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      isCancelled = true;
    };
  }, [
    user?.id,
    userIdFromQuery,
    branchIdFromQuery,
    conceptIdFromQuery,
    refreshGraph,
    loadConceptEdgesForBranch,
    loadSubconceptEdgesForConcept,
  ]);

  const handleSelectBranch = useCallback((branchId: string) => {
    setHighlightedBranchId((prev) => (prev === branchId ? null : branchId));
  }, []);

  const handleOpenBranch = useCallback(
    async (branchId: string) => {
      setView({ level: "branch", branchId });
      setHighlightedBranchId(null);
      setFocusedNodeId(null);
      setExpandedNodeId(null);

      if (!activeUserId) return;

      const rootId = branchRootByBranchId[branchId];
      if (!rootId) return;

      setIsSyncing(true);
      try {
        await runTopicAgent(rootId, activeUserId);
        const nodesRows = await refreshGraph(activeUserId);
        await loadConceptEdgesForBranch(branchId, nodesRows);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to open branch");
      } finally {
        setIsSyncing(false);
      }
    },
    [
      activeUserId,
      branchRootByBranchId,
      refreshGraph,
      loadConceptEdgesForBranch,
    ],
  );

  const handleSelectConcept = useCallback((_conceptId: string) => {
    // Concept-level focus is handled by view navigation.
  }, []);

  const handleOpenConcept = useCallback(
    async (conceptId: string) => {
      if (view.level !== "branch") return;

      const branchNodes = getConceptNodesForBranch(graphNodes, view.branchId);
      const rootId = branchRootByBranchId[view.branchId];
      const dependencyEdges = rootId ? conceptEdgesByRootId[rootId] : undefined;
      const edges = dependencyEdges?.length
        ? toReactFlowEdges(dependencyEdges)
        : buildLinearFallbackEdges(branchNodes);
      const lockedNodeIds = buildLockedNodeIds(branchNodes, edges);
      if (lockedNodeIds.has(conceptId)) {
        setError("This node is locked. Complete all parent nodes first.");
        return;
      }

      setExpandedNodeId(null);
      setView({ level: "concept", branchId: view.branchId, conceptId });

      if (!activeUserId) return;

      setIsSyncing(true);
      try {
        await generateSubconcepts(conceptId, activeUserId);
        await refreshGraph(activeUserId);
        await loadSubconceptEdgesForConcept(conceptId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to open concept");
      } finally {
        setIsSyncing(false);
      }
    },
    [
      view,
      graphNodes,
      branchRootByBranchId,
      conceptEdgesByRootId,
      activeUserId,
      refreshGraph,
      loadSubconceptEdgesForConcept,
    ],
  );

  const isNodeLockedInCurrentView = useCallback(
    (nodeId: string) => {
      if (view.level === "branch") {
        const branchNodes = getConceptNodesForBranch(graphNodes, view.branchId);
        const rootId = branchRootByBranchId[view.branchId];
        const dependencyEdges = rootId
          ? conceptEdgesByRootId[rootId]
          : undefined;
        const edges = dependencyEdges?.length
          ? toReactFlowEdges(dependencyEdges)
          : buildLinearFallbackEdges(branchNodes);
        return buildLockedNodeIds(branchNodes, edges).has(nodeId);
      }

      if (view.level === "concept") {
        const conceptNodes = getSubconceptNodesForConcept(
          graphNodes,
          view.conceptId,
        );
        const dependencyEdges =
          subconceptEdgesByConceptId[view.conceptId] ?? [];
        const explicitEdges = toReactFlowEdges(dependencyEdges);
        const incoming = new Set(explicitEdges.map((edge) => edge.target));
        const rootEdges = conceptNodes
          .filter((node) => node.data.variant === "subconcept")
          .filter((node) => !incoming.has(node.id))
          .map((node) => ({
            id: `entry-${view.conceptId}-${node.id}`,
            source: view.conceptId,
            target: node.id,
            data: { isStructural: true },
          }));
        return buildLockedNodeIds(conceptNodes, [
          ...explicitEdges,
          ...rootEdges,
        ]).has(nodeId);
      }

      return false;
    },
    [
      view,
      graphNodes,
      branchRootByBranchId,
      conceptEdgesByRootId,
      subconceptEdgesByConceptId,
    ],
  );

  const handleOpenNode = useCallback(
    (nodeId: string) => {
      if (isNodeLockedInCurrentView(nodeId)) {
        setError("This node is locked. Complete all parent nodes first.");
        return;
      }

      if (view.level === "branch") {
        void handleOpenConcept(nodeId);
      } else if (view.level === "concept") {
        setExpandedNodeId(null);
        const query = new URLSearchParams({ nodeId });
        query.set("branchId", view.branchId);
        query.set("conceptId", view.conceptId);
        if (activeUserId) {
          query.set("userId", activeUserId);
        }
        router.push(`/learn?${query.toString()}`);
      }
    },
    [view, isNodeLockedInCurrentView, handleOpenConcept, activeUserId, router],
  );

  const handleBack = useCallback(() => {
    setExpandedNodeId(null);
    setFocusedNodeId(null);
    if (view.level === "concept") {
      setView({ level: "branch", branchId: view.branchId });
    } else if (view.level === "branch") {
      setView({ level: "global" });
    }
  }, [view]);

  const handleForceNodeClick = useCallback(
    (nodeId: string) => {
      const node = graphNodes.find((candidate) => candidate.id === nodeId);
      if (!node || node.data.variant === "root") return;

      if (nodeId === focusedNodeId) {
        if (node.data.variant === "concept" && node.data.branchId) {
          void handleOpenBranch(node.data.branchId);
          setExpandedNodeId(nodeId);
        } else if (
          node.data.variant === "subconcept" &&
          node.data.branchId &&
          node.data.parentId
        ) {
          setView({
            level: "concept",
            branchId: node.data.branchId,
            conceptId: node.data.parentId,
          });
          void loadSubconceptEdgesForConcept(node.data.parentId);
        }
        setFocusedNodeId(null);
        setHighlightedBranchId(null);
        return;
      }

      setFocusedNodeId(nodeId);
      if (node.data.branchId) {
        setHighlightedBranchId(node.data.branchId);
      }
    },
    [
      graphNodes,
      focusedNodeId,
      handleOpenBranch,
      loadSubconceptEdgesForConcept,
    ],
  );

  const handleReactFlowNodeClick = useCallback(
    (nodeId: string) => {
      if (isNodeLockedInCurrentView(nodeId)) {
        return;
      }

      if (view.level === "branch") {
        const node = graphNodes.find((candidate) => candidate.id === nodeId);
        if (node?.data.variant === "concept") {
          setExpandedNodeId((prev) => (prev === nodeId ? null : nodeId));
        }
      } else if (view.level === "concept") {
        const node = graphNodes.find((candidate) => candidate.id === nodeId);
        if (node?.data.variant === "subconcept") {
          setExpandedNodeId((prev) => (prev === nodeId ? null : nodeId));
        }
      }
    },
    [view, graphNodes, isNodeLockedInCurrentView],
  );

  const { filteredNodes, filteredEdges } = useMemo(() => {
    if (view.level === "branch") {
      const branchNodes = getConceptNodesForBranch(graphNodes, view.branchId);
      const rootId = branchRootByBranchId[view.branchId];
      const dependencyEdges = rootId ? conceptEdgesByRootId[rootId] : undefined;
      const edges = dependencyEdges?.length
        ? toReactFlowEdges(dependencyEdges)
        : buildLinearFallbackEdges(branchNodes);

      const nodesWithLocks = applyLockedState(branchNodes, edges);

      return {
        filteredNodes: nodesWithLocks,
        filteredEdges: edges,
      };
    }

    if (view.level === "concept") {
      const conceptNodes = getSubconceptNodesForConcept(
        graphNodes,
        view.conceptId,
      );
      const dependencyEdges = subconceptEdgesByConceptId[view.conceptId] ?? [];
      const explicitEdges = toReactFlowEdges(dependencyEdges);

      const incoming = new Set(explicitEdges.map((edge) => edge.target));
      const rootEdges = conceptNodes
        .filter((node) => node.data.variant === "subconcept")
        .filter((node) => !incoming.has(node.id))
        .map((node) => ({
          id: `entry-${view.conceptId}-${node.id}`,
          source: view.conceptId,
          target: node.id,
          data: { isStructural: true },
        }));

      const edges = [...explicitEdges, ...rootEdges];
      const nodesWithLocks = applyLockedState(conceptNodes, edges);

      return {
        filteredNodes: nodesWithLocks,
        filteredEdges: edges,
      };
    }

    return {
      filteredNodes: [],
      filteredEdges: [] as Edge[],
    };
  }, [
    view,
    graphNodes,
    branchRootByBranchId,
    conceptEdgesByRootId,
    subconceptEdgesByConceptId,
  ]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0A1A0F] text-sm text-[#3DBF5A]/80">
        Loading learning graph...
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-[#0A1A0F]">
      <GraphSidebar
        view={view}
        branches={branches}
        nodes={view.level === "global" ? graphNodes : filteredNodes}
        highlightedBranchId={highlightedBranchId}
        onSelectBranch={handleSelectBranch}
        onOpenBranch={(branchId) => void handleOpenBranch(branchId)}
        onSelectConcept={handleSelectConcept}
        onOpenConcept={(conceptId) => void handleOpenConcept(conceptId)}
        onSelectSubconcept={handleOpenNode}
        onBack={handleBack}
      />

      <div className="absolute inset-0 left-72">
        {error && (
          <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
        {isSyncing && (
          <div className="pointer-events-none absolute right-4 top-4 z-20 rounded-lg border border-[rgba(46,232,74,0.25)] bg-[rgba(10,26,15,0.8)] px-3 py-2 text-xs text-[#2EE84A]">
            Syncing with backend...
          </div>
        )}

        {view.level === "global" && (
          <ForceGraphView
            branches={branches}
            nodes={graphNodes}
            highlightedBranchId={highlightedBranchId}
            focusedNodeId={focusedNodeId}
            onNodeClick={handleForceNodeClick}
          />
        )}
        {(view.level === "branch" || view.level === "concept") && (
          <GraphCanvas
            key={
              view.level === "branch"
                ? `branch-${view.branchId}`
                : `concept-${view.conceptId}`
            }
            nodes={filteredNodes}
            edges={filteredEdges}
            onNodeClick={handleReactFlowNodeClick}
            expandedNodeId={expandedNodeId}
            onOpenConcept={handleOpenNode}
            onPaneClick={() => setExpandedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}
