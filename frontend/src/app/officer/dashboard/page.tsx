"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RiskIndicator } from "@/components/dashboard/RiskIndicator";
import {
  Users,
  Send,
  AlertTriangle,
  Building2,
  PackageOpen,
  ArrowRight,
} from "lucide-react";
import { apiClient } from "@/services/api/client";
import Link from "next/link";

export default function OfficerDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [recentDistributions, setRecentDistributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const officerName = user?.name || "Officer dashboard";
  const officerId = user?.id ? `OFF-${user.id.slice(-6).toUpperCase()}` : null;
  const jurisdiction = user?.jurisdiction;

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const response = await apiClient.get("/officer/summary");
        if (!response.data?.success || !response.data?.stats) {
          throw new Error(response.data?.detail || response.data?.error || "Officer dashboard data is unavailable.");
        }
        setStats(response.data.stats);
        setRecentRequests(Array.isArray(response.data.recentRequests) ? response.data.recentRequests : []);
        setRecentDistributions(Array.isArray(response.data.recentDistributions) ? response.data.recentDistributions : []);
      } catch (cause) {
        setStats(null);
        setRecentRequests([]);
        setRecentDistributions([]);
        setDataError(cause instanceof Error ? cause.message : "Officer dashboard data is unavailable.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const stat = (key: string) => loading ? "…" : dataError ? "—" : Number(stats?.[key] ?? 0).toLocaleString();
  const pendingRequests = recentRequests.filter((request) =>
    ["SUBMITTED", "PENDING", "UNDER_REVIEW", "OFFICER_VERIFICATION"].includes(String(request.status).toUpperCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {officerId && <span className="bg-white text-foreground font-mono text-xs px-2.5 py-1 border border-border font-semibold">
              {officerId}
            </span>}
            {jurisdiction && <span className="text-sm text-muted-foreground">{jurisdiction}</span>}
          </div>
          <p className="eyebrow mb-1">Officer workspace</p>
          <h1 className="editorial-heading text-3xl text-foreground sm:text-4xl">{officerName}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/officer/distribution"
            className="inline-flex min-h-11 items-center justify-center px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Release Commodities
          </Link>
        </div>
      </div>

      {dataError && <div role="alert" className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{dataError}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <StatsCard
          title="Assigned beneficiaries"
          value={stat("assignedBeneficiaries")}
          description={jurisdiction || "Accounts assigned to your officer ID"}
          icon={Users}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Pending verifications"
          value={stat("pendingVerifications")}
          description="Assigned accounts awaiting verification"
          icon={Send}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Pending modifications"
          value={stat("pendingRequests")}
          description="Requests from assigned beneficiaries"
          icon={Send}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Approved requests"
          value={stat("approvedRequests")}
          description="Approved requests in your assigned caseload"
          icon={Building2}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard title="Rejected requests" value={stat("rejectedRequests")} description="Rejected requests in your assigned caseload" icon={PackageOpen} iconBgColor="bg-secondary text-primary border border-border" />
        <StatsCard title="Today's distributions" value={stat("distributionsToday")} description={`Completed receipts · ₹${Number(stats?.distributionValueToday ?? 0).toLocaleString()}`} icon={Building2} iconBgColor="bg-secondary text-primary border border-border" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-border p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Send className="size-4 text-primary" /> Pending Modification
                Diff Reviews
              </h2>
              <Link
                href="/officer/requests"
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
              >
                Open Review Module <ArrowRight className="size-3" />
              </Link>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-secondary text-primary border border-border">
                  <PackageOpen className="size-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  No Pending Modification Requests
                </p>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  When enrolled citizens submit address changes, family
                  additions, or quota modifications, they will appear here for
                  verification.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-background p-4 border border-border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-primary">
                          {req.id}
                        </span>
                        <h3 className="font-bold text-xs text-foreground mt-0.5">
                          {req.beneficiary_name || req.beneficiary_id || "Citizen Request"}
                        </h3>
                      </div>
                      {Number.isFinite(Number(req.ai_risk_score)) && req.ai_risk_score !== undefined && <RiskIndicator score={Number(req.ai_risk_score)} level={req.ai_risk_level || "LOW"} />}
                    </div>

                    <div className="text-xs text-foreground bg-card p-2.5 rounded border border-border">
                      <span className="text-[10px] font-bold text-muted-foreground block uppercase">
                        Request Type:
                      </span>
                      <span>{req.request_type}{req.reason ? ` • ${req.reason}` : ""}</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Link
                        href={`/officer/requests?id=${req.id}`}
                        className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-md transition-all shadow-subtle"
                      >
                        Compare Previous vs Requested Values
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white border border-border p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3"><h2 className="font-bold text-sm text-foreground flex items-center gap-2"><Building2 className="size-4 text-primary" />Recent distributions</h2><Link href="/officer/distribution" className="text-xs font-semibold text-primary hover:underline">Open terminal</Link></div>
            {recentDistributions.length === 0 ? <p className="py-5 text-center text-xs text-muted-foreground">No completed releases are recorded for your officer account.</p> : <ul className="space-y-3">{recentDistributions.slice(0, 5).map((row) => <li key={row.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"><span className="min-w-0"><span className="block truncate font-mono text-xs font-semibold text-primary">{row.transactionCode}</span><span className="block truncate text-xs text-muted-foreground">Beneficiary {row.beneficiaryId}</span></span><span className="shrink-0 text-right text-xs text-foreground">₹{Number(row.totalCost || 0).toFixed(2)}<span className="block text-[10px] text-muted-foreground">{row.distributedAt ? new Date(row.distributedAt).toLocaleDateString() : "Date unavailable"}</span></span></li>)}</ul>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-border p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                <AlertTriangle className="size-4 text-primary" /> Field Risk
                Alerts
              </h2>
              <Link
                href="/officer/alerts"
                className="text-xs text-primary hover:underline font-semibold"
              >
                View All
              </Link>
            </div>

            <div className="py-8 text-center space-y-2">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-secondary text-primary border border-border">
                <AlertTriangle className="size-5" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat("openAlerts")}</p>
              <p className="text-xs font-semibold text-foreground">Open field risk alerts</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Persisted alerts for beneficiaries assigned to your officer account.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
