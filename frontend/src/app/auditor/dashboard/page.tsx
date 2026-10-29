"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ArrowRight, FileCheck2, History, ShieldCheck } from "lucide-react";
import Link from "next/link";

type AuditSummary = { total: number; isTamperFree: boolean; totalVerified: number };

export default function AuditorDashboard() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadSummary() {
      try {
        const [trailResponse, integrityResponse] = await Promise.all([
          fetch("/api/auditor/audit-trail?limit=1", { cache: "no-store" }),
          fetch("/api/auditor/verify-integrity", { cache: "no-store" }),
        ]);
        const [trail, integrity] = await Promise.all([trailResponse.json(), integrityResponse.json()]);
        if (!trailResponse.ok || !trail.success || !integrityResponse.ok || !integrity.success || !integrity.report) {
          throw new Error(trail.error || trail.detail || integrity.error || integrity.detail || "Audit data is unavailable.");
        }
        if (active) setSummary({ total: Number(trail.total) || 0, isTamperFree: Boolean(integrity.report.isTamperFree), totalVerified: Number(integrity.report.totalVerified) || 0 });
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Audit data is unavailable.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadSummary();
    return () => { active = false; };
  }, []);

  const analystId = user?.id ? `AUD-${user.id.slice(-6).toUpperCase()}` : null;
  const value = (n?: number) => loading ? "…" : error || n === undefined ? "—" : n.toLocaleString();

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {analystId && <span className="border border-border bg-white px-2.5 py-1 font-mono text-xs font-semibold">{analystId}</span>}
            {user?.jurisdiction && <span className="text-sm text-muted-foreground">{user.jurisdiction}</span>}
          </div>
          <p className="eyebrow mb-1">Audit and integrity</p>
          <h1 className="editorial-heading text-3xl text-foreground sm:text-4xl">Audit overview</h1>
        </div>
        <Link href="/auditor/audit-trail" className="inline-flex min-h-11 items-center justify-center gap-2 bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Open audit trail <ArrowRight className="size-4" /></Link>
      </header>

      {error && <div role="alert" className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Could not load audit data: {error}</div>}

      <section aria-label="Audit service results" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatsCard title="Audit records" value={value(summary?.total)} description="Total returned by the audit service" icon={History} />
        <StatsCard title="Integrity result" value={loading ? "…" : summary ? summary.isTamperFree ? "Passed" : "Needs review" : "—"} description="Latest hash-chain verification" icon={ShieldCheck} />
        <StatsCard title="Records checked" value={value(summary?.totalVerified)} description="Records included in verification" icon={FileCheck2} />
      </section>

      {!loading && !error && summary?.total === 0 && (
        <div className="border border-border bg-white px-6 py-10 text-center">
          <h2 className="text-lg font-semibold text-foreground">No audit records returned</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">The audit service currently has no records to display. The integrity result above reflects the verification response.</p>
        </div>
      )}
    </div>
  );
}
