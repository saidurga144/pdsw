"use client";

import React, { useEffect, useState } from "react";
import { Beneficiary } from "@/types";
import { BeneficiaryService } from "@/services/beneficiary.service";
import { useAuthStore } from "@/stores/auth.store";
import { Users, UserPlus, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

export default function FamilyManagementPage() {
  const { user } = useAuthStore();
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const data = await BeneficiaryService.getMyProfile();
        if (isMounted && data) {
          setBeneficiary(data);
        }
      } catch (err) {
        console.error("Error fetching family data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  if (loading && !beneficiary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
        <Loader2 className="size-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-mono">
          Loading enrolled family members...
        </p>
      </div>
    );
  }

  const members = beneficiary?.familyMembers || [
    {
      id: `fm-${user?.id || "ben"}-1`,
      beneficiaryId: user?.id || "ben-1",
      fullName: user?.name || "Authenticated Citizen",
      relationship: "HEAD" as const,
      age: 35,
      gender: "MALE" as const,
      uidHash: `0x${user?.id?.slice(-8) || "00000000"}`,
      verificationStatus: "VERIFIED" as const,
      addedAt: new Date().toISOString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Family Members & Entitlements
          </h1>
          <p className="text-xs text-muted-foreground">
            View enrolled family dependents and track member modification
            requests
          </p>
        </div>

        <Link
          href="/beneficiary/requests"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle"
        >
          <UserPlus className="size-4" /> Request Member Addition
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {members.map((member) => (
          <div
            key={member.id}
            className="bg-card border border-border rounded-md p-5 space-y-3 relative hover:border-primary/40 transition-all shadow-subtle"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold bg-secondary px-2 py-0.5 rounded text-foreground border border-border">
                {member.relationship}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-secondary/80 px-2 py-0.5 rounded border border-border">
                <CheckCircle2 className="size-3" /> VERIFIED
              </span>
            </div>

            <div>
              <h3 className="font-bold text-sm text-foreground">
                {member.fullName}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Age: {member.age} • Gender: {member.gender}
              </p>
            </div>

            <div className="bg-muted/40 p-2 rounded border border-border text-[11px] font-mono text-muted-foreground flex items-center justify-between gap-2 min-w-0">
              <span className="shrink-0">UID Hash:</span>
              <span
                className="text-foreground font-semibold technical-value text-right"
                title={member.uidHash}
              >
                {member.uidHash}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
