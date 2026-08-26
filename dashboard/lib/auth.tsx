"use client";

import { useRouter } from "next/navigation";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api, clearToken, getToken, setToken, type BuilderUser } from "./api";
interface AuthState {
  builder: BuilderUser | null;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [builder, setBuilder] = useState<BuilderUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      const token = getToken();
      if (!token) {
        setIsReady(true);
        return;
      }
      api<BuilderUser>("/api/v1/auth/me")
        .then((me) => {
          if (!cancelled) setBuilder(me);
        })
        .catch(() => {
          if (!cancelled) clearToken();
        })
        .finally(() => {
          if (!cancelled) setIsReady(true);
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api<{ access_token: string }>("/api/v1/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(result.access_token);
    const me = await api<BuilderUser>("/api/v1/auth/me");
    setBuilder(me);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setBuilder(null);
  }, []);

  return <AuthContext.Provider value={{ builder, isReady, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { builder, isReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !builder) router.replace("/login");
  }, [isReady, builder, router]);

  if (!isReady || !builder) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>
    );
  }
  return <>{children}</>;
}

