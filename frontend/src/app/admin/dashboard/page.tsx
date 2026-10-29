"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ArrowRight, Cpu, Database, FileText, Users, ShieldCheck, UserCog, Activity } from "lucide-react";
import Link from "next/link";

type PlatformStats = {
  totalUsers: number;
  admins: number;
  pdsOfficers: number;
  socAnalysts: number;
  beneficiaries: number;
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
        const response = await fetch("/api/admin/stats", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data.success || !data.stats) {
          throw new Error(data.error || data.detail || "Platform statistics are unavailable.");
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

      <section aria-label="Active account counts" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Active accounts" value={count(stats?.totalUsers)} description="Accounts returned by the platform service" icon={Users} />
        <StatsCard title="Beneficiaries" value={count(stats?.beneficiaries)} description="Active beneficiary accounts" icon={Users} />
        <StatsCard title="PDS officers" value={count(stats?.pdsOfficers)} description="Active officer accounts" icon={Activity} />
        <StatsCard title="Administrators and SOC" value={loading || error ? "—" : ((stats?.admins ?? 0) + (stats?.socAnalysts ?? 0)).toLocaleString()} description={stats ? `${stats.admins} administrators · ${stats.socAnalysts} SOC analysts` : "Role counts unavailable"} icon={ShieldCheck} />
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
