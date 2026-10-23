'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Home } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

export default function UnauthorizedPage() {
  const { role } = useAuthStore();

  const getDashboardLink = () => {
    switch (role) {
      case 'BENEFICIARY':
        return '/beneficiary/dashboard';
      case 'OFFICER':
        return '/officer/dashboard';
      case 'ADMIN':
        return '/admin/dashboard';
      case 'SOC':
        return '/auditor/dashboard';
      case 'SOC':
        return '/soc/dashboard';
      default:
        return '/';
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full rounded-md border border-border bg-card p-8 text-center space-y-6 shadow-card">
        <div className="mx-auto flex size-14 items-center justify-center rounded-md bg-destructive-light border border-destructive-border text-destructive">
          <ShieldAlert className="size-7" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-destructive bg-destructive-light px-2.5 py-0.5 rounded border border-destructive-border">
            HTTP 403 • RBAC VIOLATION
          </span>
          <h1 className="text-2xl font-extrabold text-foreground">ACCESS DENIED</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You do not have administrative authorization to access this portal with your current <span className="font-mono text-foreground font-bold">{role}</span> credentials.
          </p>
        </div>

        <div className="p-3 bg-muted/40 border border-border rounded-md text-[11px] font-mono text-muted-foreground text-left">
          <span>Security Audit Event: SEC-RBAC-VIOLATION-LOGGED</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <Link
            href={getDashboardLink()}
            className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider transition-all shadow-subtle"
          >
            Return to Dashboard
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-md border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted/50 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Home className="size-3.5" />
            <span>Public Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
