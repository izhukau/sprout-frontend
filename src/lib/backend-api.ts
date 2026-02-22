export type BackendUser = {
  id: string;
  email: string;
  title: string | null;
  desc: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BackendBranch = {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type BackendNode = {
  id: string;
  userId: string;
  type: "root" | "concept" | "subconcept";
  branchId: string | null;
  parentId: string | null;
  title: string;
  desc: string | null;
  accuracyScore: number;
  createdAt: string;
  updatedAt: string;
};

export type BackendNodeContent = {
  id: string;
  nodeId: string;
  explanationMd: string;
  visualizationKind: string | null;
  visualizationPayload: string | null;
  generatedByModel: string | null;
  generationPromptHash: string | null;
  status: "draft" | "active" | "archived";
  createdAt: string;
};

export type BackendEdge = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  createdAt: string;
};

export type BackendProgress = {
  id: string;
  userId: string;
  nodeId: string;
  firstEnteredAt: string | null;
  lastEnteredAt: string | null;
  completedAt: string | null;
  masteryScore: number;
  attemptsCount: number;
  hasGeneratedSubnodes: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BackendChatSession = {
  id: string;
  userId: string;
  nodeId: string | null;
  startedAt: string;
  endedAt: string | null;
};

export type BackendChatMessage = {
  id: string;
  sessionId: string;
  userId: string;
  role: "system" | "user" | "assistant";
  kind: "learning" | "hint_request" | "hint_response" | "evaluation";
  content: string;
  wasSuccessful: boolean | null;
  successSignal: string | null;
  createdAt: string;
};

export const DEFAULT_BRANCH_TITLES = [
  "Data Structures & Algorithms",
  "Systems",
  "Discrete Math",
];

export const API_PREFIX =
  process.env.NEXT_PUBLIC_BACKEND_PROXY_PREFIX ?? "/backend-api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_PREFIX}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // ignore parsing errors and keep fallback message
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function createUser(input: {
  email: string;
  title?: string | null;
  desc?: string | null;
}): Promise<BackendUser> {
  return apiFetch<BackendUser>("/api/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getUser(userId: string): Promise<BackendUser> {
  return apiFetch<BackendUser>(`/api/users/${userId}`);
}

export async function listBranches(userId: string): Promise<BackendBranch[]> {
  return apiFetch<BackendBranch[]>(
    `/api/branches?${new URLSearchParams({ userId }).toString()}`,
  );
}

export async function createBranch(input: {
  userId: string;
  title: string;
}): Promise<BackendBranch> {
  return apiFetch<BackendBranch>("/api/branches", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listNodes(filters: {
  userId?: string;
  type?: "root" | "concept" | "subconcept";
  branchId?: string;
  parentId?: string;
}): Promise<BackendNode[]> {
  const query = new URLSearchParams();
  if (filters.userId) query.set("userId", filters.userId);
  if (filters.type) query.set("type", filters.type);
  if (filters.branchId) query.set("branchId", filters.branchId);
  if (filters.parentId) query.set("parentId", filters.parentId);
  return apiFetch<BackendNode[]>(`/api/nodes?${query.toString()}`);
}

export async function getNode(nodeId: string): Promise<BackendNode> {
  return apiFetch<BackendNode>(`/api/nodes/${nodeId}`);
}

export async function createNode(input: {
  userId: string;
  type: "root" | "concept" | "subconcept";
  branchId?: string | null;
  parentId?: string | null;
  title: string;
  desc?: string | null;
}): Promise<BackendNode> {
  return apiFetch<BackendNode>("/api/nodes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listProgress(userId: string): Promise<BackendProgress[]> {
  return apiFetch<BackendProgress[]>(
    `/api/progress?${new URLSearchParams({ userId }).toString()}`,
  );
}

export async function uploadDocuments(
  nodeId: string,
  files: File[],
): Promise<{ uploaded: { id: string; originalName: string }[] }> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch(`${API_PREFIX}/api/nodes/${nodeId}/documents`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = `Upload failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // ignore parsing errors
    }
    throw new Error(message);
  }

  return (await response.json()) as {
    uploaded: { id: string; originalName: string }[];
  };
}

export async function listDependencyEdges(
  parentNodeId: string,
  childType?: "concept" | "subconcept",
): Promise<BackendEdge[]> {
  const query = new URLSearchParams();
  if (childType) query.set("childType", childType);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<BackendEdge[]>(
    `/api/nodes/${parentNodeId}/dependency-edges${suffix}`,
  );
}

export async function listChatSessions(filters: {
  userId?: string;
  nodeId?: string;
}): Promise<BackendChatSession[]> {
  const query = new URLSearchParams();
  if (filters.userId) query.set("userId", filters.userId);
  if (filters.nodeId) query.set("nodeId", filters.nodeId);
  return apiFetch<BackendChatSession[]>(
    `/api/chat/sessions?${query.toString()}`,
  );
}

export async function createChatSession(input: {
  userId: string;
  nodeId?: string | null;
}): Promise<BackendChatSession> {
  return apiFetch<BackendChatSession>("/api/chat/sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listChatMessages(
  sessionId: string,
): Promise<BackendChatMessage[]> {
  return apiFetch<BackendChatMessage[]>(
    `/api/chat/sessions/${sessionId}/messages`,
  );
}

export async function sendTutorMessage(
  sessionId: string,
  input: { userId: string; content: string },
): Promise<{ message: string; isComplete: boolean }> {
  return apiFetch<{ message: string; isComplete: boolean }>(
    `/api/chat/sessions/${sessionId}/tutor`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function getActiveNodeContent(
  nodeId: string,
): Promise<BackendNodeContent | null> {
  return apiFetch<BackendNodeContent | null>(
    `/api/nodes/${nodeId}/contents/active`,
  );
}
