"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Role } from "@/types";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export default function RoleLoginPage() {
  const params = useParams();
  const rawRole = (params?.role as string)?.toUpperCase();

  const roleMap: Record<string, Role> = {
    BENEFICIARY: "BENEFICIARY",
    OFFICER: "OFFICER",
    "PDS-OFFICER": "OFFICER",
    ADMIN: "ADMIN",
    SOC: "SOC",
    "SOC-ANALYST": "SOC",
    "SECURITY-ANALYST": "SOC",
  };

  const selectedRole: Role = roleMap[rawRole] || "BENEFICIARY";

  return (
    <div className="py-6 px-4">
      <AuthLayout
        title={`${selectedRole} Portal Login`}
        subtitle={`Enter authorized credentials to access the ${selectedRole.toLowerCase()} workspace`}
      >
        <LoginForm initialRole={selectedRole} />
      </AuthLayout>
    </div>
  );
}
