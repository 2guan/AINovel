import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import AppRouteFallback from "@/components/layout/AppRouteFallback";
import { useAuth } from "./AuthProvider";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AppRouteFallback />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if ((user.role === "pending" || user.status === "pending_review") && location.pathname !== "/pending-review") {
    return <Navigate to="/pending-review" replace />;
  }
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <AppRouteFallback />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
