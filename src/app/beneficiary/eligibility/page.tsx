"use client";

import React, { useEffect, useState } from "react";
import { Beneficiary } from "@/types";
import { BeneficiaryService } from "@/services/beneficiary.service";
import { useAuthStore } from "@/stores/auth.store";
import { FileCheck, ShieldCheck, Loader2 } from "lucide-react";

export default function BeneficiaryEligibilityPage() {
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
        console.error("Error fetching eligibility data:", err);
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
          Loading welfare quota eligibility...
        </p>
      </div>
    );
  }

  const eligibility = beneficiary?.eligibility || {
    beneficiaryId: user?.id || "BEN-USER",
    category: "PHH" as const,
    monthlyEntitlements: [
      {
        commodity: "Rice (Fortified)",
        quantity: 20,
        unit: "KG",
        subsidizedPricePerUnit: 3.0,
      },
      {
        commodity: "Wheat (Whole Grain)",
        quantity: 15,
        unit: "KG",
        subsidizedPricePerUnit: 2.0,
      },
      {
        commodity: "Refined Sugar",
        quantity: 2,
        unit: "KG",
        subsidizedPricePerUnit: 13.5,
      },
      {
        commodity: "Kerosene (Illumination)",
        quantity: 3,
        unit: "L",
        subsidizedPricePerUnit: 18.0,
      },
    ],
    monthlyIncome: 10000,
    isBPL: true,
    lastReviewedAt: "2026-08-01T00:00:00Z",
    nextReviewDue: "2027-08-01T00:00:00Z",
    status: "ELIGIBLE" as const,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Ration Eligibility & Entitlements
          </h1>
          <p className="text-xs text-muted-foreground">
            Official monthly commodity quotas and subsidy price schedules
          </p>
        </div>

        <span className="px-3 py-1 bg-secondary text-foreground font-mono text-xs font-bold rounded-full border border-border self-start sm:self-auto">
          STATUS: {eligibility.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-md p-5 space-y-4 shadow-subtle">
          <h2 className="font-bold text-sm text-foreground border-b border-border pb-3 flex items-center gap-2">
            <FileCheck className="size-4 text-primary" /> Monthly Subsidized
            Commodities
          </h2>

          <div className="space-y-3">
            {eligibility.monthlyEntitlements.map((item) => (
              <div
                key={item.commodity}
                className="bg-muted/40 p-4 rounded-md border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm text-foreground">
                    {item.commodity}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    State Subsidized Rate:{" "}
                    <span className="font-mono text-primary font-bold">
                      ₹{item.subsidizedPricePerUnit}
                    </span>{" "}
                    per {item.unit}
                  </p>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-xl font-extrabold text-foreground font-mono">
                    {item.quantity} {item.unit}
                  </span>
                  <p className="text-[10px] text-muted-foreground uppercase font-mono block">
                    Monthly Limit
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-md p-5 space-y-4 shadow-subtle">
          <h2 className="font-bold text-sm text-foreground border-b border-border pb-3">
            Eligibility Audit Details
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">
                Ration Scheme Category
              </span>
              <span className="font-bold text-foreground">
                {eligibility.category}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">
                Certified Household Income
              </span>
              <span className="font-mono text-foreground">
                ₹{eligibility.monthlyIncome.toLocaleString()} / mo
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">
                Below Poverty Line (BPL)
              </span>
              <span className="font-bold text-primary">
                {eligibility.isBPL ? "YES (Verified)" : "NO"}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">
                Last Eligibility Review
              </span>
              <span className="font-mono text-muted-foreground">
                {new Date(eligibility.lastReviewedAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">
                Next Review Scheduled
              </span>
              <span className="font-mono text-foreground">
                {new Date(eligibility.nextReviewDue).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
