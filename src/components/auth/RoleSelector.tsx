'use client';

import React from 'react';
import { Role } from '@/types';
import { UserCheck, Shield, Settings, Eye, Lock, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

interface RoleSelectorProps {
  selectedRole: Role;
  onSelectRole: (role: Role) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRole, onSelectRole }) => {
  const roles: { role: Role; title: string; desc: string; icon: any }[] = [
    {
      role: 'BENEFICIARY',
      title: 'Beneficiary',
      desc: 'Citizen ration cards & entitlements',
      icon: UserCheck,
    },
    {
      role: 'OFFICER',
      title: 'PDS Officer',
      desc: 'Inspector operational portal',
      icon: Shield,
    },
    {
      role: 'ADMIN',
      title: 'Administrator',
      desc: 'Central HQ system management',
      icon: Settings,
    },
    {
      role: 'SOC',
      title: 'SOC Analyst',
      desc: 'CERT-In SOC cyber monitoring',
      icon: Lock,
    },
  ];

  return (
    <div className="space-y-2.5">
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
        Select Access Portal
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {roles.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedRole === item.role;
          return (
            <button
              type="button"
              key={item.role}
              onClick={() => onSelectRole(item.role)}
              className={clsx(
                'p-3 rounded-md border text-left transition-all flex items-center justify-between shadow-subtle',
                isSelected
                  ? 'border-primary bg-secondary text-foreground ring-1 ring-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-md bg-secondary/50 border border-border shrink-0 text-primary">
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{item.desc}</p>
                </div>
              </div>
              {isSelected && <CheckCircle2 className="size-4 text-primary shrink-0 ml-2" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
