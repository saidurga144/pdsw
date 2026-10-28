"use client";

import React, { useState, useEffect } from "react";
import { Beneficiary } from "@/types";
import { apiClient } from "@/services/api/client";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  PackageOpen,
  Loader2,
} from "lucide-react";

export default function VerificationQueuePage() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadQueue() {
      try {
        const res = await apiClient.get("/officer/beneficiaries");
        if (res.data?.success && Array.isArray(res.data.beneficiaries)) {
          setBeneficiaries(res.data.beneficiaries);
        } else {
          setBeneficiaries([]);
        }
      } catch {
        setBeneficiaries([]);
      } finally {
        setLoading(false);
      }
    }

    loadQueue();
  }, []);

  const pending = beneficiaries.filter(
    (b) =>
      b.verificationStatus === "FLAGGED" || b.verificationStatus === "PENDING",
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-bold text-foreground">
          Beneficiary Verification Queue
        </h1>
        <p className="text-xs text-muted-foreground">
          Review pending citizen applications and document authenticity
        </p>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-md p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-xs">Loading verification queue...</span>
        </div>
      ) : pending.length === 0 ? (
        <div className="bg-card border border-border rounded-md p-12 text-center space-y-3 shadow-subtle">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-primary border border-border">
            <PackageOpen className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="empty-state-title text-foreground uppercase">
              Verification Queue Empty (0 Items)
            </h3>
            <p className="empty-state-description text-muted-foreground max-w-sm mx-auto">
              No pending beneficiary applications require manual verification.
              New online enrollments requiring officer field review will appear
              here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((b) => (
            <div
              key={b.id}
              className="bg-card border border-border rounded-md p-5 shadow-subtle space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div className="min-w-0">
                  <span className="font-mono text-xs font-bold text-primary">
                    {b.id}
                  </span>
                  <h3 className="font-bold text-sm text-foreground mt-0.5">
                    {b.fullName} ({b.rationCardId})
                  </h3>
                </div>
                <span className="px-3 py-1 bg-secondary text-foreground font-mono text-xs font-bold rounded-full border border-border shrink-0 self-start sm:self-auto">
                  STATUS: {b.verificationStatus}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-muted/40 p-3 rounded-md border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                    PDS Center
                  </span>
                  <span className="text-foreground font-semibold">
                    {b.address?.pdsCenterName || "Assigned Center"}
                  </span>
                </div>
                <div className="bg-muted/40 p-3 rounded-md border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                    Category
                  </span>
                  <span className="text-primary font-mono font-bold">
                    {b.rationCategory}
                  </span>
                </div>
                <div className="bg-muted/40 p-3 rounded-md border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                    AI Risk Score
                  </span>
                  <span className="text-foreground font-mono font-bold">
                    {b.riskScore || 5}/100 ({b.riskLevel || "LOW"})
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
                <button className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive font-semibold text-xs rounded-md transition-all">
                  Reject Application
                </button>
                <button className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-md shadow-subtle transition-all">
                  Approve & Issue Ration Entitlement
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
