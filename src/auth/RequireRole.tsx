import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import type { UserRole } from "../data/dbTypes";

export function RequireRole({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const { profile, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        Loading…
      </div>
    );
  }
  if (!profile) return <Navigate to="/login" replace />;
  if (!allow.includes(profile.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}