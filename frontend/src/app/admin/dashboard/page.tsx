"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ArrowRight, Cpu, Database, FileText, Users, ShieldCheck, UserCog, Activity } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/services/api/client";

type PlatformStats = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  admins: number;
  pdsOfficers: number;
  socAnalysts: number;
  beneficiaries: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  completedDistributions: number;
  distributionsToday: number;
  openAlerts: number;
  recentRequests: Array<Record<string, unknown>>;
  recentRegistrations: Array<Record<string, unknown>>;
  recentActivity: Array<Record<string, unknown>>;
};

const adminTools = [
  { href: "/admin/users", icon: Users, title: "User directory", description: "Search accounts and manage their status." },
  { href: "/admin/roles", icon: UserCog, title: "Roles and permissions", description: "Review role access controls." },
  { href: "/admin/integrity", icon: ShieldCheck, title: "Integrity verification", description: "Inspect available record verification results." },
  { href: "/admin/ipfs", icon: Database, title: "Document provenance", description: "Review configured IPFS records and evidence." },
  { href: "/admin/ai-intelligence", icon: Cpu, title: "Risk intelligence", description: "Open available analysis and alert tools." },
  { href: "/admin/reports", icon: FileText, title: "System reports", description: "Review available system reports." },
];

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadStats() {
      try {
        const response = await apiClient.get("/admin/stats", { headers: { "Cache-Control": "no-cache" } });
        const data = response.data;
        if (!data?.success || !data.stats) {
          throw new Error(data?.error || data?.detail || "Platform statistics are unavailable.");
        }
        if (active) setStats(data.stats);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Platform statistics are unavailable.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadStats();
    return () => { active = false; };
  }, []);

  const adminId = user?.id ? `ADM-${user.id.slice(-6).toUpperCase()}` : null;
  const count = (value?: number) => loading ? "…" : error ? "—" : (value ?? 0).toLocaleString();

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {adminId && <span className="border border-border bg-white px-2.5 py-1 font-mono text-xs font-semibold text-foreground">{adminId}</span>}
            {user?.jurisdiction && <span className="text-sm text-muted-foreground">{user.jurisdiction}</span>}
          </div>
          <p className="eyebrow mb-1">Administration</p>
          <h1 className="editorial-heading text-3xl text-foreground sm:text-4xl">System overview</h1>
        </div>
        <Link href="/admin/users" className="inline-flex min-h-11 items-center justify-center gap-2 bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          Manage users <ArrowRight className="size-4" />
        </Link>
      </header>

      {error && <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Could not load live platform counts: {error}</div>}

      <section aria-label="Live platform statistics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatsCard title="Registered accounts" value={count(stats?.totalUsers)} description="All roles in the account store" icon={Users} />
        <StatsCard title="Active accounts" value={count(stats?.activeUsers)} description="Accounts currently active" icon={Activity} />
        <StatsCard title="Inactive accounts" value={count(stats?.inactiveUsers)} description="Inactive or suspended accounts" icon={ShieldCheck} />
        <StatsCard title="Beneficiaries" value={count(stats?.beneficiaries)} description="Registered beneficiary accounts" icon={Users} />
        <StatsCard title="PDS officers" value={count(stats?.pdsOfficers)} description="Registered officer accounts" icon={Activity} />
        <StatsCard title="Pending requests" value={count(stats?.pendingRequests)} description={`${stats?.approvedRequests ?? 0} approved · ${stats?.rejectedRequests ?? 0} rejected`} icon={FileText} />
        <StatsCard title="Completed distributions" value={count(stats?.completedDistributions)} description={`${stats?.distributionsToday ?? 0} completed today`} icon={Database} />
        <StatsCard title="Open risk alerts" value={count(stats?.openAlerts)} description="Persisted, unacknowledged alerts" icon={ShieldCheck} />
        <StatsCard title="Admin and SOC accounts" value={loading || error ? "—" : ((stats?.admins ?? 0) + (stats?.socAnalysts ?? 0)).toLocaleString()} description={stats ? `${stats.admins} administrators · ${stats.socAnalysts} SOC analysts` : "Role counts unavailable"} icon={Cpu} />
      </section>

      <section aria-label="Recent platform activity" className="grid gap-4 xl:grid-cols-3">
        <div className="border border-border bg-white p-5">
          <h2 className="mb-3 border-b border-border pb-3 text-sm font-semibold text-foreground">Recent registrations</h2>
          {!loading && !error && (stats?.recentRegistrations?.length ?? 0) === 0 ? <p className="text-xs text-muted-foreground">No registration records are available.</p> : <ul className="space-y-3">{(stats?.recentRegistrations ?? []).slice(0, 6).map((row, index) => <li key={String(row.id ?? index)} className="flex items-start justify-between gap-3 text-xs"><span className="min-w-0"><span className="block truncate font-semibold text-foreground">{String(row.name || "Unnamed account")}</span><span className="font-mono text-[10px] text-muted-foreground">{String(row.role || "")}</span></span><time className="shrink-0 text-[10px] text-muted-foreground">{row.createdAt ? new Date(String(row.createdAt)).toLocaleDateString() : "Date unavailable"}</time></li>)}</ul>}
        </div>
        <div className="border border-border bg-white p-5">
          <h2 className="mb-3 border-b border-border pb-3 text-sm font-semibold text-foreground">Recent change requests</h2>
          {!loading && !error && (stats?.recentRequests?.length ?? 0) === 0 ? <p className="text-xs text-muted-foreground">No request records are available.</p> : <ul className="space-y-3">{(stats?.recentRequests ?? []).slice(0, 6).map((row, index) => <li key={String(row.id ?? index)} className="flex items-start justify-between gap-3 text-xs"><span className="min-w-0"><span className="block truncate font-mono font-semibold text-primary">{String(row.id || "Request")}</span><span className="block truncate text-foreground">{String(row.beneficiaryName || "Beneficiary")} · {String(row.type || "")}</span></span><span className="shrink-0 text-[10px] text-muted-foreground">{String(row.status || "")}</span></li>)}</ul>}
        </div>
        <div className="border border-border bg-white p-5">
          <h2 className="mb-3 border-b border-border pb-3 text-sm font-semibold text-foreground">Administrative activity</h2>
          {!loading && !error && (stats?.recentActivity?.length ?? 0) === 0 ? <p className="text-xs text-muted-foreground">No audit events are available from the configured audit store.</p> : <ul className="space-y-3">{(stats?.recentActivity ?? []).slice(0, 6).map((row, index) => <li key={`${String(row.actorId)}-${String(row.timestamp)}-${index}`} className="flex items-start justify-between gap-3 text-xs"><span className="min-w-0"><span className="block truncate font-semibold text-foreground">{String(row.action || "Recorded event")}</span><span className="font-mono text-[10px] text-muted-foreground">{String(row.role || "")} · {String(row.actorId || "")}</span></span><time className="shrink-0 text-[10px] text-muted-foreground">{row.timestamp ? new Date(String(row.timestamp)).toLocaleDateString() : "Date unavailable"}</time></li>)}</ul>}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-1">Workspace</p>
            <h2 className="text-xl font-semibold text-foreground">Administration tools</h2>
          </div>
          <Link href="/admin/settings" className="text-sm font-semibold text-primary hover:underline">Settings</Link>
        </div>
        <div className="grid border-l border-t border-border sm:grid-cols-2 xl:grid-cols-3">
          {adminTools.map(({ href, icon: Icon, title, description }) => (
            <Link key={href} href={href} className="group flex min-h-36 items-start gap-4 border-b border-r border-border bg-white p-5 transition-colors hover:bg-[#F8F8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-6">
              <span className="flex size-10 shrink-0 items-center justify-center border border-border bg-background text-primary"><Icon className="size-[18px]" /></span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-semibold text-foreground">{title}<ArrowRight className="size-3.5 text-primary opacity-0 transition-opacity group-hover:opacity-100" /></span>
                <span className="mt-1 block text-sm leading-5 text-muted-foreground">{description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
