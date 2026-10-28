"use client";

import React, { useState } from "react";
import { MOCK_BENEFICIARIES } from "@/mock-data/pds-data";
import { TransactionService } from "@/services/transaction.service";
import {
  Building2,
  Search,
  CheckCircle,
  ShieldCheck,
  Printer,
  PackageOpen,
  AlertCircle,
} from "lucide-react";
import { Beneficiary } from "@/types";

export default function OfficerDistributionPage() {
  const [searchId, setSearchId] = useState("");
  const [selectedBeneficiary, setSelectedBeneficiary] =
    useState<Beneficiary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [error, setError] = useState("");

  const handleLookup = () => {
    setError("");
    const cleanQuery = searchId.trim().toLowerCase();
    if (!cleanQuery) {
      setError(
        "Please enter a Beneficiary ID or Ration Card Number to verify.",
      );
      setSelectedBeneficiary(null);
      return;
    }

    const found = MOCK_BENEFICIARIES.find(
      (b) =>
        b.id.toLowerCase() === cleanQuery ||
        b.rationCardId.toLowerCase() === cleanQuery,
    );

    if (found) {
      setSelectedBeneficiary(found);
    } else {
      setSelectedBeneficiary(null);
      setError(
        `No beneficiary record found matching "${searchId}". Please check ID and try again.`,
      );
    }
  };

  const handleConfirmRelease = async () => {
    if (!selectedBeneficiary) return;
    setIsProcessing(true);
    const commodities = selectedBeneficiary.eligibility.monthlyEntitlements.map(
      (e, idx) => ({
        id: `c-${idx}`,
        name: e.commodity,
        quantity: e.quantity,
        unit: e.unit,
        pricePerUnit: e.subsidizedPricePerUnit,
        totalPrice: e.quantity * e.subsidizedPricePerUnit,
      }),
    );
    const totalAmount = commodities.reduce(
      (acc, curr) => acc + curr.totalPrice,
      0,
    );

    const dist = await TransactionService.createDistribution({
      beneficiaryId: selectedBeneficiary.id,
      beneficiaryName: selectedBeneficiary.fullName,
      rationCardId: selectedBeneficiary.rationCardId,
      commodities,
      totalAmount,
    });
    setIsProcessing(false);
    setReceipt(dist);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-bold text-foreground">
          Commodity Distribution Terminal
        </h1>
        <p className="text-xs text-muted-foreground">
          Fair Price Shop • Biometric & Entitlement Verification Release
        </p>
      </div>

      <div className="bg-card border border-border rounded-md p-4 flex flex-col sm:flex-row gap-3 shadow-subtle">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Scan QR or Enter Beneficiary ID / Ration Card..."
            value={searchId}
            onChange={(e) => {
              setSearchId(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLookup();
            }}
            className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-2.5 text-xs text-foreground font-mono focus:border-primary focus:outline-none"
          />
        </div>
        <button
          onClick={handleLookup}
          className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle"
        >
          Verify Entitlement
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-md border border-destructive/30 bg-destructive/10 animate-in fade-in duration-200">
          <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive font-medium">{error}</p>
        </div>
      )}

      {!selectedBeneficiary ? (
        <div className="bg-card border border-border rounded-md p-12 text-center space-y-3 shadow-subtle">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-primary border border-border">
            <PackageOpen className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
              Terminal Ready
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Scan a citizen&apos;s QR code or enter their Beneficiary ID above
              to verify entitlements and execute biometrically authenticated
              distribution.
            </p>
          </div>
        </div>
      ) : (
        /* Selected Beneficiary Entitlement Review */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          <div className="lg:col-span-2 bg-card border border-border rounded-md p-5 space-y-4 shadow-subtle">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-primary">
                  {selectedBeneficiary.id}
                </span>
                <h2 className="text-base font-bold text-foreground mt-0.5">
                  {selectedBeneficiary.fullName}
                </h2>
              </div>
              <span className="shrink-0 px-3 py-1 bg-secondary text-foreground font-mono text-xs font-bold rounded-full border border-border">
                ELIGIBLE ({selectedBeneficiary.rationCategory})
              </span>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Available Quota Selection
              </h3>
              {selectedBeneficiary.eligibility.monthlyEntitlements.map(
                (item) => (
                  <div
                    key={item.commodity}
                    className="bg-muted/40 p-3.5 rounded-md border border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-foreground">
                        {item.commodity}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Rate: ₹{item.subsidizedPricePerUnit}/{item.unit}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-mono text-sm font-bold text-primary">
                        {item.quantity} {item.unit}
                      </span>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="size-4 accent-[#6F8A77] rounded"
                      />
                    </div>
                  </div>
                ),
              )}
            </div>

            <div className="pt-2 border-t border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Biometric Authenticator: READY
              </span>
              <button
                onClick={handleConfirmRelease}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-md shadow-subtle transition-all"
              >
                {isProcessing
                  ? "Processing Biometric..."
                  : "Confirm Commodity Release"}
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-md p-5 space-y-3 text-xs shadow-subtle">
            <h3 className="font-bold text-sm text-foreground border-b border-border pb-2">
              Terminal Verification
            </h3>
            <p className="text-muted-foreground">
              FPS Terminal ID:{" "}
              <span className="font-mono text-foreground">FPS-DEL-102</span>
            </p>
            <p className="text-muted-foreground">
              Operator:{" "}
              <span className="font-semibold text-foreground">
                Field Inspector
              </span>
            </p>
            <div className="p-3 bg-secondary text-primary border border-border rounded-md font-mono text-[11px] flex items-center gap-2">
              <ShieldCheck className="size-4" /> State Hash Lock Active
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="responsive-modal-overlay-muted">
          <div className="responsive-modal-panel responsive-modal-panel-sm font-mono text-xs">
            <div className="responsive-modal-header flex items-center justify-between gap-3 font-sans">
              <span className="min-w-0 font-bold text-base text-primary">
                Distribution Success!
              </span>
              <button
                onClick={() => setReceipt(null)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Close distribution receipt"
              >
                ✕
              </button>
            </div>
            <div className="responsive-modal-body space-y-3">
              <p className="font-sans text-xs text-muted-foreground">
                Receipt pinned to IPFS CID:
              </p>
              <p className="bg-muted/40 p-2.5 rounded border border-border text-primary technical-value-wrap text-[11px]">
                {receipt.ipfsCid}
              </p>
            </div>
            <div className="responsive-modal-footer">
              <button
                onClick={() => setReceipt(null)}
                className="w-full py-2 bg-primary hover:bg-primary-hover text-white font-sans font-semibold text-xs rounded-md shadow-subtle transition-all"
              >
                Done & Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
