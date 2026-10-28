"use client";

import React from "react";
import { useAuthStore } from "@/stores/auth.store";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Eye, ShieldCheck, History, FileSpreadsheet } from "lucide-react";
import Link from "next/link";

export default function AuditorDashboard() {
  const { user } = useAuthStore();

  const auditorName = user?.name || "CAG Lead Auditor";
  const auditorId = user?.id
    ? `AUD-${user.id.slice(-6).toUpperCase()}`
    : "AUD-004";
  const jurisdiction =
    user?.jurisdiction || "Comptroller and Auditor General (CAG)";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-secondary text-primary font-mono text-[11px] px-2.5 py-0.5 rounded border border-border font-bold">
              {auditorId}
            </span>
            <span className="text-xs text-muted-foreground">
              {jurisdiction} • Read-Only Probe
            </span>
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {auditorName} — Compliance Overview
          </h1>
        </div>

        <Link
          href="/auditor/audit-trail"
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-md shadow-subtle transition-all"
        >
          Open Audit Explorer
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Audit Events"
          value="4,120,991"
          description="Immutable log entries"
          icon={History}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Integrity Verification"
          value="100.0%"
          description="SHA-256 State Matched"
          icon={ShieldCheck}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Pending Investigations"
          value="0"
          description="Tamper-Free Ledger"
          icon={Eye}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Compliance Score"
          value="99.5/100"
          description="OWASP & CAG Standards"
          icon={FileSpreadsheet}
          iconBgColor="bg-secondary text-primary border border-border"
        />
      </div>
    </div>
  );
}
