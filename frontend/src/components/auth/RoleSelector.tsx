"use client";

import React from "react";
import { Role } from "@/types";
import { ROLE_OPTIONS } from "@/lib/role-utils";
import { UserCheck, Shield, Settings, Lock, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

interface RoleSelectorProps {
  selectedRole: Role;
  onSelectRole: (role: Role) => void;
}

const ROLE_ICONS: Record<Role, typeof UserCheck> = {
  BENEFICIARY: UserCheck,
  PDS_OFFICER: Shield,
  ADMIN: Settings,
  SOC_ANALYST: Lock,
};

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  selectedRole,
  onSelectRole,
}) => {
  return (
    <div className="space-y-2.5">
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
        Select Access Portal
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {ROLE_OPTIONS.map((item) => {
          const Icon = ROLE_ICONS[item.value];
          const isSelected = selectedRole === item.value;
          return (
            <button
              type="button"
              key={item.value}
              onClick={() => onSelectRole(item.value)}
              className={clsx(
                "p-3 rounded-md border text-left transition-all flex items-center justify-between shadow-subtle",
                isSelected
                  ? "border-primary bg-secondary text-foreground ring-1 ring-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-md bg-secondary/50 border border-border shrink-0 text-primary">
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                    {item.description}
                  </p>
                </div>
              </div>
              {isSelected && (
                <CheckCircle2 className="size-4 text-primary shrink-0 ml-2" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
