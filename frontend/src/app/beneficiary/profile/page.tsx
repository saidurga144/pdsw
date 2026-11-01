"use client";

import React, { useEffect } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useBeneficiaryStore } from "@/stores/beneficiary.store";
import {
  UserCheck,
  Lock,
  Edit3,
  MapPin,
  Phone,
  Mail,
  Building,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export default function BeneficiaryProfilePage() {
  const { user } = useAuthStore();
  const {
    profile: beneficiary,
    isLoading: loading,
    error,
    ensureLoaded,
  } = useBeneficiaryStore();

  useEffect(() => {
    ensureLoaded(user);
  }, [user?.id]);

  if (loading && !beneficiary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
        <Loader2 className="size-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-mono">
          Loading authenticated profile identity...
        </p>
      </div>
    );
  }

  if (!beneficiary) return <section className="mx-auto max-w-2xl border border-border bg-white p-10 text-center"><h1 className="ben-title text-foreground">Profile unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error || "Your saved profile could not be loaded."}</p></section>;
  const profile = beneficiary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="ben-title text-foreground">
            Beneficiary Profile & Identity
          </h1>
          <p className="text-xs text-muted-foreground">
            View official ration card information and submit change requests
          </p>
        </div>

        <Link
          href="/beneficiary/requests"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle"
        >
          <Edit3 className="size-4" /> Request Modification
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-md p-5 space-y-4 shadow-subtle">
          <h2 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
            <UserCheck className="size-4 text-primary" /> Personal Identity
            Records
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between gap-3 min-w-0 py-1 border-b border-border/60">
              <span className="shrink-0 text-muted-foreground">
                Head of Family Name
              </span>
              <span className="font-semibold text-foreground text-right truncate">
                {profile.fullName}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 min-w-0 py-1 border-b border-border/60">
              <span className="shrink-0 text-muted-foreground flex items-center gap-1">
                <Lock className="size-3 text-primary" /> Ration Card Number
              </span>
              <span className="font-mono font-bold text-primary text-right truncate">
                {profile.rationCardId || "Not recorded"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 min-w-0 py-1 border-b border-border/60">
              <span className="shrink-0 text-muted-foreground flex items-center gap-1">
                <Lock className="size-3 text-primary" /> Ration Scheme Category
              </span>
              <span className="font-bold text-foreground text-right">
                {profile.rationCategory || "Not configured"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 min-w-0 py-1 border-b border-border/60">
              <span className="shrink-0 text-muted-foreground flex items-center gap-1">
                <Phone className="size-3 text-primary" /> Registered Mobile
                Phone
              </span>
              <span className="font-mono text-foreground text-right">
                {profile.phone || "Not recorded"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 min-w-0 py-1 border-b border-border/60">
              <span className="shrink-0 text-muted-foreground flex items-center gap-1">
                <Mail className="size-3 text-primary" /> Registered Account
                Email
              </span>
              <span className="font-mono text-foreground text-right technical-value">
                {user?.email || "N/A"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 min-w-0 py-1 border-b border-border/60">
              <span className="shrink-0 text-muted-foreground">
                Registered Family Size
              </span>
              <span className="font-bold text-foreground text-right">
                {profile.familyCount} Members
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-md p-5 space-y-4 shadow-subtle">
          <h2 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
            <MapPin className="size-4 text-primary" /> Address & Fair Price Shop
            Assignment
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-start justify-between gap-3 min-w-0 py-1 border-b border-border/60">
              <span className="shrink-0 text-muted-foreground">
                Door & Street Address
              </span>
              <span className="font-semibold text-foreground text-right">
                {[profile.address.doorNo, profile.address.street].filter(Boolean).join(", ") || "Not recorded"}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 min-w-0 py-1 border-b border-border/60">
              <span className="shrink-0 text-muted-foreground">
                District & State
              </span>
              <span className="text-foreground text-right">
                {[profile.address.district, profile.address.state].filter(Boolean).join(", ") || "Not recorded"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 min-w-0 py-1 border-b border-border/60">
              <span className="shrink-0 text-muted-foreground">Pincode</span>
              <span className="font-mono text-foreground text-right">
                {profile.address.pincode || "Not recorded"}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 min-w-0 py-1 border-b border-border/60">
              <span className="shrink-0 text-muted-foreground flex items-center gap-1">
                <Building className="size-3 text-primary" /> Assigned Fair Price
                Shop
              </span>
              <span className="font-semibold text-primary text-right">
                {[profile.address.pdsCenterName, profile.address.pdsCenterId].filter(Boolean).join(" · ") || "Not assigned"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
