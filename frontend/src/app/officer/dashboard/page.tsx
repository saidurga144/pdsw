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
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { apiClient } from "@/services/api/client";
import Link from "next/link";

export default function OfficerDashboard() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [beneficiaryCount, setBeneficiaryCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const officerName = user?.name || "Officer dashboard";
  const officerId = user?.id ? `OFF-${user.id.slice(-6).toUpperCase()}` : null;
  const jurisdiction = user?.jurisdiction;

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [reqRes, benRes] = await Promise.allSettled([
          apiClient.get("/officer/requests"),
          apiClient.get("/officer/beneficiaries"),
        ]);

        if (
          reqRes.status === "fulfilled" &&
          reqRes.value.data?.success &&
          Array.isArray(reqRes.value.data.requests)
        ) {
          setRequests(reqRes.value.data.requests);
        } else {
          setRequests([]);
          setDataError("Modification requests could not be loaded.");
        }

        if (
          benRes.status === "fulfilled" &&
          benRes.value.data?.success &&
          Array.isArray(benRes.value.data.beneficiaries)
        ) {
          setBeneficiaryCount(benRes.value.data.beneficiaries.length);
        } else {
          setBeneficiaryCount(0);
          setDataError((current) => current || "Beneficiary records could not be loaded.");
        }
      } catch {
        setRequests([]);
        setBeneficiaryCount(0);
        setDataError("Officer dashboard data is unavailable.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const pendingRequests = requests.filter(
    (r) => r.status === "SUBMITTED" || r.status === "PENDING",
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatsCard
          title="Beneficiaries returned"
          value={loading ? "…" : dataError ? "—" : beneficiaryCount.toLocaleString()}
          description={jurisdiction || "Current officer query result"}
          icon={Users}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Pending Modifications"
          value={loading ? "…" : dataError ? "—" : pendingRequests.length.toString()}
          description="Submitted or pending requests returned"
          icon={Send}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Flagged Risk Alerts"
          value="—"
          description="No officer-visible risk feed configured"
          icon={AlertTriangle}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Today's Release Txns"
          value="—"
          description="Release totals are not included in this summary"
          icon={Building2}
          iconBgColor="bg-secondary text-primary border border-border"
        />
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
                          {req.beneficiary_id || "Citizen Request"}
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
                <CheckCircle className="size-5" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                Risk feed unavailable
              </p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                No officer-visible risk alert data source is connected to this dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
