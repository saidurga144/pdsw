"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";
import { useBeneficiaryStore } from "@/stores/beneficiary.store";
import { CheckCircle2, Loader2, UserPlus, Users } from "lucide-react";

export default function FamilyManagementPage() {
  const { user } = useAuthStore();
  const { profile, isLoading, error, ensureLoaded } = useBeneficiaryStore();
  useEffect(() => { void ensureLoaded(user); }, [user?.id, ensureLoaded]);
  if (isLoading && !profile) return <div className="flex min-h-[300px] flex-col items-center justify-center gap-3"><Loader2 className="size-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Loading saved family records…</p></div>;
  if (!profile) return <section className="mx-auto max-w-2xl border border-border bg-white p-10 text-center"><h1 className="ben-title text-foreground">Family records unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error || "Family records could not be loaded."}</p></section>;
  const members = profile.familyMembers;
  return <div className="space-y-6">
    <header className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center"><div><h1 className="ben-title text-foreground">Family Members & Entitlements</h1><p className="text-xs text-muted-foreground">View enrolled family members and submit enrollment or removal requests</p></div><Link href="/beneficiary/requests" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-subtle transition-all hover:bg-primary-hover"><UserPlus className="size-4" />Request Member Addition</Link></header>
    {members.length === 0 ? <section className="border border-border bg-card p-10 text-center"><Users className="mx-auto mb-3 size-7 text-primary" /><h2 className="font-semibold text-foreground">No family members recorded</h2><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Use a family enrollment request to submit a member for review.</p></section> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{members.map((member) => <article key={member.id} className="space-y-3 rounded-md border border-border bg-card p-5 shadow-subtle"><div className="flex items-center justify-between gap-2"><span className="rounded border border-border bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold text-foreground">{member.relationship}</span><span className="inline-flex items-center gap-1 rounded border border-border bg-secondary/80 px-2 py-0.5 text-[10px] font-bold text-primary"><CheckCircle2 className="size-3" />{member.verificationStatus}</span></div><div><h2 className="text-sm font-semibold text-foreground">{member.fullName}</h2><p className="mt-0.5 text-xs text-muted-foreground">{member.gender || "Gender not recorded"}{member.age != null ? ` · Age ${member.age}` : ""}</p></div><div className="flex items-center justify-between gap-2 rounded border border-border bg-muted/40 p-2 text-[11px]"><span className="text-muted-foreground">Identity ending</span><span className="font-mono font-semibold text-foreground">{member.identityLastFour ? `•••• ${member.identityLastFour}` : "Not recorded"}</span></div></article>)}</div>}
  </div>;
}
