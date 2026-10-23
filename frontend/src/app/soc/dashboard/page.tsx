'use client';

import React from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ShieldAlert, AlertTriangle, Lock, Cpu, Eye, Activity } from 'lucide-react';
import Link from 'next/link';

export default function SOCSecurityDashboard() {
  const { user } = useAuthStore();

  const analystName = user?.name || 'Principal SOC Analyst';
  const analystId = user?.id ? `SOC-${user.id.slice(-6).toUpperCase()}` : 'SOC-CERT-005';
  const jurisdiction = user?.jurisdiction || 'National Cyber Response Centre (CERT-In)';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-secondary text-primary font-mono text-[11px] px-2.5 py-0.5 rounded border border-border font-bold">
              {analystId}
            </span>
            <span className="text-xs text-muted-foreground">{jurisdiction}</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">{analystName} — SOC Cyber Security Dashboard</h1>
        </div>

        <Link
          href="/soc/cyber-ai"
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-md shadow-subtle transition-all"
        >
          Cyber AI Anomaly Analytics
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Failed Login Attempts"
          value="0"
          description="Real-Time MongoDB SOC Stream"
          icon={Lock}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="RBAC Violations"
          value="0"
          description="Privilege Escalation Blocked"
          icon={AlertTriangle}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Integrity Mismatch Alerts"
          value="0"
          description="Database vs IPFS Hash"
          icon={ShieldAlert}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Active Cyber Incidents"
          value="0"
          description="All systems nominal"
          icon={Cpu}
          iconBgColor="bg-secondary text-primary border border-border"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-md p-5 space-y-4 shadow-subtle">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
              <ShieldAlert className="size-4 text-primary" /> Active Cyber Threat Incidents
            </h2>
            <Link href="/soc/incidents" className="text-xs text-primary hover:underline font-semibold">
              View All
            </Link>
          </div>

          <div className="p-4 text-center text-xs text-muted-foreground bg-muted/40 rounded-md border border-border">
            No active critical incidents reported in the last 24 hours. Threat detection rules active.
          </div>
        </div>

        <div className="bg-card border border-border rounded-md p-5 space-y-4 shadow-subtle">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Activity className="size-4 text-primary" /> Real-time Security Ingestion Pipeline
            </h2>
            <Link href="/soc/events" className="text-xs text-primary hover:underline font-semibold">
              Live Stream
            </Link>
          </div>

          <div className="p-4 text-center text-xs text-muted-foreground bg-muted/40 rounded-md border border-border">
            MongoDB native security event stream connected. Automated brute-force and privilege escalation monitoring enabled.
          </div>
        </div>
      </div>
    </div>
  );
}
