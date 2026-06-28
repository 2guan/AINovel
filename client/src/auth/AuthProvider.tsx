import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CurrentUser, LoginResponse } from "@/api/auth";
import { getCurrentUser, logout as logoutRequest } from "@/api/auth";
import { clearAuthToken, getAuthToken, setAuthToken } from "./authStorage";

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setLoginSession: (session: LoginResponse) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(getAuthToken()));

  const refreshUser = useCallback(async () => {
    if (!getAuthToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await getCurrentUser();
      setUser(response.data ?? null);
    } catch {
      clearAuthToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const setLoginSession = useCallback((session: LoginResponse) => {
    setAuthToken(session.token);
    setUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getAuthToken()) {
        await logoutRequest().catch(() => null);
      }
    } finally {
      clearAuthToken();
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === "admin",
    setLoginSession,
    refreshUser,
    logout,
  }), [isLoading, logout, refreshUser, setLoginSession, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
