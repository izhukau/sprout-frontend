"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import type {
  AuthResponse,
  AuthState,
  LoginRequest,
  RegisterRequest,
  SessionUser,
} from "@/lib/auth/types";

type AuthContextValue = AuthState & {
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_API_ENABLED = process.env.NEXT_PUBLIC_ENABLE_AUTH === "true";
const SESSION_STORAGE_KEY = "sprout_session_user";

type BackendUserRow = {
  id: string;
  email: string;
  title: string | null;
};

function toSessionUser(row: BackendUserRow): SessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.title?.trim() || row.email.split("@")[0] || "Learner",
  };
}

function readStoredSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function persistSessionUser(user: SessionUser | null) {
  if (typeof window === "undefined") return;
  if (!user) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
}

async function listBackendUsers(): Promise<BackendUserRow[]> {
  const response = await fetch("/backend-api/api/users");
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  return (await response.json()) as BackendUserRow[];
}

async function createBackendUser(input: {
  email: string;
  title?: string | null;
}): Promise<BackendUserRow> {
  const response = await fetch("/backend-api/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error ?? "Failed to create user");
  }
  return (await response.json()) as BackendUserRow;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!AUTH_API_ENABLED) {
      setUser(readStoredSessionUser());
      setIsLoading(false);
      return;
    }

    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json() as Promise<AuthResponse>;
      })
      .then((data) => {
        setUser(data.user);
        persistSessionUser(data.user);
      })
      .catch(() => {
        setUser(null);
        persistSessionUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    if (!AUTH_API_ENABLED) {
      const email = data.email.trim().toLowerCase();
      const users = await listBackendUsers();
      const matched = users.find(
        (candidate) => candidate.email.toLowerCase() === email,
      );

      const resolvedUser =
        matched ??
        (await createBackendUser({
          email,
          title: email.split("@")[0] || "Learner",
        }));

      const sessionUser = toSessionUser(resolvedUser);
      setUser(sessionUser);
      persistSessionUser(sessionUser);
      return;
    }

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error ?? "Login failed");
    }
    const { user } = (await res.json()) as AuthResponse;
    setUser(user);
    persistSessionUser(user);
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    if (!AUTH_API_ENABLED) {
      const email = data.email.trim().toLowerCase();
      const users = await listBackendUsers();
      const matched = users.find(
        (candidate) => candidate.email.toLowerCase() === email,
      );

      const resolvedUser =
        matched ??
        (await createBackendUser({
          email,
          title: data.name?.trim() || "Learner",
        }));

      const sessionUser = toSessionUser(resolvedUser);
      setUser(sessionUser);
      persistSessionUser(sessionUser);
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error ?? "Registration failed");
    }
    const { user } = (await res.json()) as AuthResponse;
    setUser(user);
    persistSessionUser(user);
  }, []);

  const logout = useCallback(async () => {
    if (!AUTH_API_ENABLED) {
      setUser(null);
      persistSessionUser(null);
      router.push("/login");
      return;
    }

    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    persistSessionUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext>
  );
}
