"use client";

import React, { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useBeneficiaryStore } from "@/stores/beneficiary.store";
import { FileCheck, Loader2 } from "lucide-react";

export default function BeneficiaryEligibilityPage() {
  const { user } = useAuthStore();
  const { profile, isLoading, error, ensureLoaded } = useBeneficiaryStore();
  useEffect(() => { void ensureLoaded(user); }, [user?.id, ensureLoaded]);

  if (isLoading && !profile) return <div className="flex min-h-[300px] flex-col items-center justify-center gap-3"><Loader2 className="size-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Loading saved eligibility data…</p></div>;
  if (!profile) return <section className="mx-auto max-w-2xl border border-border bg-white p-10 text-center"><h1 className="ben-title text-foreground">Eligibility data unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error || "Eligibility information could not be loaded."}</p></section>;

  const eligibility = profile.eligibility;
  const date = (value: string | null) => value ? new Date(value).toLocaleDateString() : "Not recorded";

  return <div className="space-y-6">
    <header className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center"><div><h1 className="ben-title text-foreground">Ration Eligibility & Entitlements</h1><p className="text-xs text-muted-foreground">Recorded category rules and household assessment information</p></div><span className="self-start rounded-full border border-border bg-secondary px-3 py-1 font-mono text-xs font-bold text-foreground sm:self-auto">STATUS: {eligibility.status}</span></header>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <section className="space-y-4 rounded-md border border-border bg-card p-5 shadow-subtle lg:col-span-2"><h2 className="ben-section-title flex items-center gap-2 border-b border-border pb-3 text-foreground"><FileCheck className="size-4 text-primary" />Monthly Subsidized Commodities</h2>
        {eligibility.monthlyEntitlements.length === 0 ? <p className="rounded-md border border-border bg-muted/30 p-5 text-sm text-muted-foreground">No entitlement rules are configured for this ration category yet.</p> : <div className="space-y-3">{eligibility.monthlyEntitlements.map((item) => <div key={item.commodity} className="flex flex-col justify-between gap-3 rounded-md border border-border bg-muted/40 p-4 sm:flex-row sm:items-center"><div><h3 className="text-sm font-bold text-foreground">{item.commodity}</h3><p className="mt-1 text-xs text-muted-foreground">Recorded subsidized rate: <span className="font-mono font-bold text-primary">₹{item.subsidizedPricePerUnit}</span> per {item.unit}</p></div><div className="shrink-0 text-left sm:text-right"><span className="font-mono text-xl font-extrabold text-foreground">{item.quantity} {item.unit}</span><p className="block font-mono text-[10px] uppercase text-muted-foreground">Monthly limit</p></div></div>)}</div>}
      </section>
      <section className="space-y-4 rounded-md border border-border bg-card p-5 shadow-subtle"><h2 className="border-b border-border pb-3 text-sm font-bold text-foreground">Eligibility Audit Details</h2><dl className="space-y-3 text-xs">
        <div className="flex justify-between gap-3 border-b border-border/60 py-1.5"><dt className="text-muted-foreground">Ration Scheme Category</dt><dd className="font-bold text-foreground">{eligibility.category || "Not configured"}</dd></div>
        <div className="flex justify-between gap-3 border-b border-border/60 py-1.5"><dt className="text-muted-foreground">Household Income</dt><dd className="font-mono text-foreground">{eligibility.monthlyIncome == null ? "Not recorded" : `₹${eligibility.monthlyIncome.toLocaleString()} / mo`}</dd></div>
        <div className="flex justify-between gap-3 border-b border-border/60 py-1.5"><dt className="text-muted-foreground">BPL Assessment</dt><dd className="font-bold text-primary">{eligibility.isBPL == null ? "Not assessed" : eligibility.isBPL ? "Yes" : "No"}</dd></div>
        <div className="flex justify-between gap-3 border-b border-border/60 py-1.5"><dt className="text-muted-foreground">Last Review</dt><dd className="font-mono text-muted-foreground">{date(eligibility.lastReviewedAt)}</dd></div>
        <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Next Review</dt><dd className="font-mono text-foreground">{eligibility.nextReviewDue ? date(eligibility.nextReviewDue) : "Not scheduled"}</dd></div>
      </dl></section>
    </div>
  </div>;
}
