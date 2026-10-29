"use client";

import React, { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useBeneficiaryStore } from "@/stores/beneficiary.store";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { IntegrityBadge } from "@/components/integrity/IntegrityBadge";
import { RiskIndicator } from "@/components/dashboard/RiskIndicator";
import {
  Users,
  FileCheck,
  History,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export default function BeneficiaryDashboard() {
  const { user } = useAuthStore();
  const {
    profile: beneficiary,
    isLoading: loading,
    error,
    ensureLoaded,
    refresh,
  } = useBeneficiaryStore();

  // Ensures profile is loaded — no-op if already cached and fresh
  useEffect(() => {
    ensureLoaded(user);
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
            <IntegrityBadge
              status={
                ben.verificationStatus === "VERIFIED"
                  ? "VERIFIED"
                  : "VERIFICATION_PENDING"
              }
              size="sm"
            />
          </div>
          <h1 className="ben-title text-foreground">{ben.fullName}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Card No:{" "}
            <span className="font-mono text-foreground font-semibold">
              {ben.rationCardId}
            </span>{" "}
            • {ben.address.pdsCenterName}
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Ration Category"
          value={ben.rationCategory}
          description="Priority Household Scheme"
          icon={FileCheck}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Family Members"
          value={`${ben.familyCount} Members`}
          description="Verified Aadhaar Entitlements"
          icon={Users}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Eligibility Status"
          value={ben.eligibility.status}
          description="Quota Active for Current Cycle"
          icon={ShieldCheck}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Risk Assessment"
          value={`${ben.riskScore}/100`}
          description={`AI Evaluation: ${ben.riskLevel}`}
          icon={History}
          iconBgColor="bg-secondary text-primary border border-border"
        />
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
            {ben.eligibility.monthlyEntitlements.map((item) => (
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
            <RiskIndicator score={ben.riskScore} level={ben.riskLevel} />
          </div>
        </div>
      </div>
    </div>
  );
}
