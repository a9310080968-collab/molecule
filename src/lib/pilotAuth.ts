import { useEffect, useState } from "react";
import type { DemoUserRole } from "../types";

export type PilotUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  avatarUrl: string | null;
  role: DemoUserRole;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};

type AuthStatus = "disabled" | "loading" | "authenticated" | "anonymous";

export const isPilotMode = import.meta.env.VITE_APP_MODE === "pilot";

export function usePilotAuth(enabled: boolean) {
  const [status, setStatus] = useState<AuthStatus>(enabled ? "loading" : "disabled");
  const [user, setUser] = useState<PilotUser | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    apiRequest<{ user: PilotUser }>("/api/auth/me", { signal: controller.signal })
      .then((response) => {
        setUser(response.user);
        setStatus("authenticated");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setUser(null);
        setStatus("anonymous");
      });
    return () => controller.abort();
  }, [enabled]);

  async function login(email: string, password: string) {
    try {
      const response = await apiRequest<{ user: PilotUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(response.user);
      setStatus("authenticated");
      return null;
    } catch (error) {
      setStatus("anonymous");
      return getAuthErrorMessage(error);
    }
  }

  async function logout() {
    try {
      await apiRequest<void>("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setStatus("anonymous");
    }
  }

  async function updateProfile(profile: { name: string; phone: string; avatarUrl?: string }) {
    const response = await apiRequest<{ user: PilotUser }>("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(profile),
    });
    setUser(response.user);
    return response.user;
  }

  function changePassword(currentPassword: string, newPassword: string) {
    return apiRequest<void>("/api/users/me/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }).catch((error: unknown) => {
      if (error instanceof PilotApiError && error.code === "invalid_current_password") {
        throw new Error("The current password is incorrect.");
      }
      if (error instanceof PilotApiError && error.code === "invalid_password") {
        throw new Error(error.message);
      }
      throw new Error("Could not update the password. Try again later.");
    });
  }

  return { status, user, login, logout, updateProfile, changePassword };
}

async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (response.ok) {
    return response.status === 204 ? undefined as T : await response.json() as T;
  }
  const body = await response.json().catch(() => ({})) as { error?: string; message?: string };
  throw new PilotApiError(response.status, body.error ?? "request_failed", body.message);
}

class PilotApiError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}

function getAuthErrorMessage(error: unknown) {
  if (error instanceof PilotApiError && error.code === "invalid_credentials") {
    return "Incorrect email or password.";
  }
  if (error instanceof PilotApiError && error.status === 429) {
    return "Too many sign-in attempts. Try again later.";
  }
  return "The server is unavailable. Check the connection and try again.";
}
