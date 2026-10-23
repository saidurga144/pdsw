'use client';

import React from 'react';
import { RoleEcosystem } from '@/components/landing/RoleEcosystem';

export default function RolesPage() {
  return (
    <div className="py-8 space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-background min-h-[85vh]">
      <div className="text-center max-w-3xl mx-auto space-y-2.5">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground bg-secondary px-3 py-1 rounded-md border border-border">
          User Ecosystem
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Platform Portals & Personas
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Select your designated portal to sign in or request authorization.
        </p>
      </div>

      <RoleEcosystem />
    </div>
  );
}
