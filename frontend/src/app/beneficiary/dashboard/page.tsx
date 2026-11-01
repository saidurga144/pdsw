"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useBeneficiaryStore } from "@/stores/beneficiary.store";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RiskIndicator } from "@/components/dashboard/RiskIndicator";
import {
  Users,
  FileCheck,
  History,
  ShieldCheck,
  ArrowRight,
  Loader2,
  FileText,
  PackageOpen,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/services/api/client";
import { useNotificationStore } from "@/stores/notification.store";

export default function BeneficiaryDashboard() {
  const { user } = useAuthStore();
  const {
    profile: beneficiary,
    isLoading: loading,
    error,
    ensureLoaded,
    refresh,
  } = useBeneficiaryStore();
  const unreadNotifications = useNotificationStore((state) => state.unreadCount);
  const [requests, setRequests] = useState<Array<Record<string, unknown>>>([]);
  const [transactions, setTransactions] = useState<Array<Record<string, any>>>([]);
  const [requestError, setRequestError] = useState("");
  const [transactionError, setTransactionError] = useState("");
  const [activityLoading, setActivityLoading] = useState(true);

  // Ensures profile is loaded — no-op if already cached and fresh
  useEffect(() => {
    ensureLoaded(user);
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    async function loadRecentActivity() {
      if (!user?.id) { setActivityLoading(false); return; }
      setActivityLoading(true);
      setRequestError("");
      setTransactionError("");
      const [requestResult, transactionResult] = await Promise.allSettled([
        apiClient.get("/beneficiary/requests"),
        apiClient.get("/beneficiary/transactions"),
      ]);
      if (!active) return;
      if (requestResult.status === "fulfilled" && Array.isArray(requestResult.value.data?.requests)) setRequests(requestResult.value.data.requests);
      else { setRequests([]); setRequestError(requestResult.status === "rejected" && requestResult.reason instanceof Error ? requestResult.reason.message : "Change request history is unavailable."); }
      if (transactionResult.status === "fulfilled" && Array.isArray(transactionResult.value.data?.transactions)) setTransactions(transactionResult.value.data.transactions);
      else { setTransactions([]); setTransactionError(transactionResult.status === "rejected" && transactionResult.reason instanceof Error ? transactionResult.reason.message : "Distribution history is unavailable."); }
      setActivityLoading(false);
    }
    void loadRecentActivity();
    return () => { active = false; };
  }, [user?.id]);

  if (loading && !beneficiary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
        <Loader2 className="size-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">
          Loading your beneficiary profile…
        </p>
      </div>
    );
  }

  if (!beneficiary) {
    return (
      <section className="mx-auto flex min-h-[420px] max-w-2xl flex-col items-center justify-center border border-border bg-white px-6 py-12 text-center">
        <div className="mb-5 flex size-12 items-center justify-center rounded-full border border-border bg-background">
          <FileCheck className="size-5 text-primary" />
        </div>
        <h1 className="editorial-heading text-2xl text-foreground">Beneficiary profile unavailable</h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
          {error || "Your profile could not be loaded from the service. Please try again shortly."}
        </p>
        <button onClick={() => refresh(user)} className="mt-6 min-h-11 bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          Try again
        </button>
      </section>
    );
  }

  const ben = beneficiary;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-border p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-secondary text-primary font-mono text-[11px] px-2.5 py-0.5 rounded border border-border font-bold">
              ID: {ben.id}
            </span>
            <span className="rounded border border-border bg-secondary px-2.5 py-0.5 font-mono text-[11px] font-bold text-foreground">ACCOUNT: {ben.verificationStatus}</span>
          </div>
          <h1 className="ben-title text-foreground">{ben.fullName}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Card No:{" "}
            <span className="font-mono text-foreground font-semibold">
              {ben.rationCardId || "Not recorded"}
            </span>{" "}
            • {ben.address.pdsCenterName || "FPS not assigned"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/beneficiary/requests"
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle"
          >
            Submit Change Request
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Ration Category"
          value={ben.rationCategory || "Not configured"}
          description={ben.rationCategory ? "Recorded ration category" : "Category not configured"}
          icon={FileCheck}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Family Members"
          value={`${ben.familyCount} Members`}
          description="Family records on file"
          icon={Users}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Eligibility Status"
          value={ben.eligibility.status}
          description="Recorded eligibility status"
          icon={ShieldCheck}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Pending requests"
          value={activityLoading ? "…" : requestError ? "—" : requests.filter((item) => ["SUBMITTED", "UNDER_REVIEW", "OFFICER_VERIFICATION", "ESCALATED"].includes(String(item.status).toUpperCase())).length}
          description="Awaiting officer review"
          icon={FileText}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard title="Unread notifications" value={unreadNotifications} description="Account-specific messages" icon={History} iconBgColor="bg-secondary text-primary border border-border" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-border p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="ben-section-title text-foreground">
                Monthly Subsidized Welfare Quota
              </h2>
              <p className="text-xs text-muted-foreground">
                Current monthly allocation available at your assigned FPS
              </p>
            </div>
            <Link
              href="/beneficiary/eligibility"
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
            >
              Full Quota Details <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {ben.eligibility.monthlyEntitlements.length === 0 ? <p className="rounded-md border border-border bg-muted/30 p-5 text-sm text-muted-foreground">No monthly entitlement rules are configured for your category yet.</p> : ben.eligibility.monthlyEntitlements.map((item) => (
              <div
                key={item.commodity}
                className="flex items-center justify-between p-3.5 rounded-md bg-muted/40 border border-border hover:border-primary/40 transition-colors"
              >
                <div>
                  <h3 className="font-bold text-xs text-foreground">
                    {item.commodity}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Subsidized Rate:{" "}
                    <span className="font-mono text-primary font-bold">
                      ₹{item.subsidizedPricePerUnit}
                    </span>{" "}
                    per {item.unit}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-foreground font-mono">
                    {item.quantity} {item.unit}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-mono block">
                    Monthly Limit
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-border p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="ben-section-title text-foreground border-b border-border pb-3">
              Citizen Self-Service Actions
            </h2>
            <div className="space-y-2">
              <Link
                href="/beneficiary/profile"
                className="w-full p-3 rounded-md bg-secondary/50 hover:bg-secondary border border-border flex items-center justify-between text-xs font-semibold text-foreground transition-all group"
              >
                <span>View Full Profile & Address</span>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link
                href="/beneficiary/family"
                className="w-full p-3 rounded-md bg-secondary/50 hover:bg-secondary border border-border flex items-center justify-between text-xs font-semibold text-foreground transition-all group"
              >
                <span>Manage Family Members</span>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link
                href="/beneficiary/requests"
                className="w-full p-3 rounded-md bg-secondary/50 hover:bg-secondary border border-border flex items-center justify-between text-xs font-semibold text-foreground transition-all group"
              >
                <span>Submit Address / Detail Change</span>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link
                href="/beneficiary/transactions"
                className="w-full p-3 rounded-md bg-secondary/50 hover:bg-secondary border border-border flex items-center justify-between text-xs font-semibold text-foreground transition-all group"
              >
                <span>Distribution Receipts & History</span>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            {ben.riskScore != null && ben.riskLevel ? <RiskIndicator score={ben.riskScore} level={ben.riskLevel} /> : <p className="text-xs text-muted-foreground">No automated risk assessment is recorded for this account.</p>}
          </div>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2" aria-label="Recent beneficiary activity">
        <div className="space-y-4 border border-border bg-white p-5">
          <div className="flex items-center justify-between border-b border-border pb-3"><h2 className="ben-section-title text-foreground">Recent change requests</h2><Link href="/beneficiary/requests" className="text-xs font-semibold text-primary hover:underline">View history</Link></div>
          {activityLoading ? <p className="text-xs text-muted-foreground">Loading request history…</p> : requestError ? <p role="alert" className="text-xs text-destructive">{requestError}</p> : requests.length === 0 ? <div className="py-5 text-center text-xs text-muted-foreground"><PackageOpen className="mx-auto mb-2 size-5" />No change requests have been submitted.</div> : <ul className="space-y-3">{requests.slice(0, 4).map((request, index) => <li key={String(request.id ?? index)} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"><span><span className="block font-mono text-xs font-semibold text-primary">{String(request.id || "Request")}</span><span className="mt-1 block text-xs text-foreground">{String(request.request_type || request.requestType || "Change request")}</span></span><span className="rounded border border-border px-2 py-1 text-[10px] font-semibold">{String(request.status || "")}</span></li>)}</ul>}
        </div>
        <div className="space-y-4 border border-border bg-white p-5">
          <div className="flex items-center justify-between border-b border-border pb-3"><h2 className="ben-section-title text-foreground">Recent distribution receipts</h2><Link href="/beneficiary/transactions" className="text-xs font-semibold text-primary hover:underline">View receipts</Link></div>
          {activityLoading ? <p className="text-xs text-muted-foreground">Loading distribution history…</p> : transactionError ? <p role="alert" className="text-xs text-destructive">{transactionError}</p> : transactions.length === 0 ? <div className="py-5 text-center text-xs text-muted-foreground"><PackageOpen className="mx-auto mb-2 size-5" />No completed distributions are recorded.</div> : <ul className="space-y-3">{transactions.slice(0, 4).map((transaction, index) => <li key={String(transaction.id ?? index)} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"><span className="min-w-0"><span className="block truncate font-mono text-xs font-semibold text-primary">{String(transaction.transactionId || "Receipt")}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{(transaction.commodities || []).map((item: any) => `${item.quantity} ${item.unit} ${item.name || item.commodity}`).join(", ")}</span></span><span className="shrink-0 text-xs font-semibold text-foreground">₹{Number(transaction.totalAmount || 0).toFixed(2)}</span></li>)}</ul>}
        </div>
      </section>
    </div>
  );
}
