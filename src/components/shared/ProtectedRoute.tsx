"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { Role } from "@/types";

interface ProtectedRouteProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const router = useRouter();
  const { role, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    } else if (!allowedRoles.includes(role)) {
      router.push("/unauthorized");
    }
  }, [role, isAuthenticated, allowedRoles, router]);

  if (!isAuthenticated || !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
};
