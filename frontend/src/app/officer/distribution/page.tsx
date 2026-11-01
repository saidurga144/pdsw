"use client";

import React, { useState } from "react";
import { TransactionService } from "@/services/transaction.service";
import { BeneficiaryService } from "@/services/beneficiary.service";
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
import { useAuthStore } from "@/stores/auth.store";

export default function OfficerDistributionPage() {
  const { user } = useAuthStore();
  const [searchId, setSearchId] = useState("");
  const [selectedBeneficiary, setSelectedBeneficiary] =
    useState<Beneficiary | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const handleLookup = async () => {
    setError("");
    const cleanQuery = searchId.trim().toLowerCase();
    if (!cleanQuery) {
      setError(
        "Please enter a Beneficiary ID or Ration Card Number to verify.",
      );
      setSelectedBeneficiary(null);
      return;
    }

    setSelectedBeneficiary(null);
    setIsLookingUp(true);
    try {
      const beneficiaries = await BeneficiaryService.getBeneficiaries();
      const found = beneficiaries.find(
        (beneficiary) =>
          String(beneficiary.id || "").trim().toLowerCase() === cleanQuery ||
          String(beneficiary.rationCardId || "").trim().toLowerCase() ===
            cleanQuery,
      );

      if (found) {
        setSelectedBeneficiary(found);
        setQuantities(Object.fromEntries(found.eligibility.monthlyEntitlements.map((item) => [item.commodity, 0])));
      } else {
        setError(
          `No beneficiary record found matching "${searchId}". Please check the ID or ration card number and try again.`,
        );
      }
    } catch (lookupError) {
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "Could not load beneficiary records. Please try again.",
      );
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleConfirmRelease = async () => {
    if (!selectedBeneficiary) return;
    setError("");
    const fpsShopId = selectedBeneficiary.address?.pdsCenterId?.trim();
    if (!fpsShopId) {
      setError("This beneficiary has no Fair Price Shop ID on record. Update the beneficiary assignment before releasing commodities.");
      return;
    }
    const commodities = selectedBeneficiary.eligibility.monthlyEntitlements
      .filter((item) => Number(quantities[item.commodity]) > 0)
      .map((item, idx) => ({
        id: `c-${idx}`,
        name: item.commodity,
        quantity: Number(quantities[item.commodity]),
        unit: item.unit,
        pricePerUnit: item.subsidizedPricePerUnit,
        totalPrice: Number(quantities[item.commodity]) * item.subsidizedPricePerUnit,
      }));
    if (!commodities.length) {
      setError("Enter a positive quantity for at least one commodity.");
      return;
    }
    const totalAmount = commodities.reduce((acc, curr) => acc + curr.totalPrice, 0);
    setIsProcessing(true);
    try {
      const dist = await TransactionService.createDistribution({
        beneficiaryId: selectedBeneficiary.id,
        beneficiaryName: selectedBeneficiary.fullName,
        rationCardId: selectedBeneficiary.rationCardId || "",
        pdsCenterId: fpsShopId,
        officerId: user?.id || "",
        commodities,
        totalAmount,
        verificationMethod: "OFFICER_VERIFIED",
      });
      setReceipt(dist);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The distribution could not be recorded.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-bold text-foreground">
          Commodity Distribution Terminal
        </h1>
        <p className="text-xs text-muted-foreground">
          Fair Price Shop • Entitlement Verification and Release
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
          type="button"
          onClick={handleLookup}
          disabled={isLookingUp}
          className="px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle"
        >
          {isLookingUp ? "Searching..." : "Verify Entitlement"}
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
            <h3 className="empty-state-title text-foreground uppercase">
              Terminal Ready
            </h3>
            <p className="empty-state-description text-muted-foreground max-w-sm mx-auto">
              Enter an assigned beneficiary ID or ration card number to load the recorded eligibility and shop information.
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
                {selectedBeneficiary.verificationStatus} ({selectedBeneficiary.rationCategory || "Category not configured"})
              </span>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Available Quota Selection
              </h3>
              {selectedBeneficiary.eligibility.monthlyEntitlements.length === 0 ? <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">No entitlement rules are configured for this beneficiary category.</p> : selectedBeneficiary.eligibility.monthlyEntitlements.map(
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
                      <span className="text-xs text-muted-foreground">Monthly limit: {item.quantity} {item.unit}</span>
                      <label className="flex items-center gap-2 text-xs text-foreground">Release
                        <input type="number" min="0" max={item.quantity} step="any" value={quantities[item.commodity] ?? 0} onChange={(event) => setQuantities((current) => ({ ...current, [item.commodity]: Math.min(item.quantity, Math.max(0, Number(event.target.value) || 0)) }))} className="w-24 rounded border border-border bg-background px-2 py-1.5 text-right font-mono" />
                        {item.unit}
                      </label>
                    </div>
                  </div>
                ),
              )}
            </div>

            <div className="pt-2 border-t border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Officer confirmation: required
              </span>
              <button
                onClick={handleConfirmRelease}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-md shadow-subtle transition-all"
              >
                {isProcessing
                  ? "Recording distribution..."
                  : "Confirm Commodity Release"}
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-md p-5 space-y-3 text-xs shadow-subtle">
            <h3 className="font-bold text-sm text-foreground border-b border-border pb-2">
              Terminal Verification
            </h3>
            <p className="text-muted-foreground">
              FPS Terminal:{" "}
              <span className="font-mono text-foreground">
                {selectedBeneficiary.address?.pdsCenterId || "Not assigned"}
              </span>
            </p>
            <p className="text-muted-foreground">
              Operator:{" "}
              <span className="font-semibold text-foreground">
                {user?.name || "PDS Officer"}
              </span>
            </p>
            <div className="p-3 bg-secondary text-primary border border-border rounded-md font-mono text-[11px] flex items-center gap-2">
              <ShieldCheck className="size-4" /> A SHA-256 receipt digest is generated when saved
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="responsive-modal-overlay-muted">
          <div className="responsive-modal-panel responsive-modal-panel-sm font-mono text-xs">
            <div className="responsive-modal-header flex items-center justify-between gap-3 font-sans">
              <span className="min-w-0 font-bold text-base text-primary">
                Distribution recorded
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
              <p className="font-sans text-xs text-muted-foreground">The distribution was saved to the application database.</p>
              <p className="font-sans text-[11px] text-muted-foreground">Transaction: <span className="font-mono text-foreground">{receipt.transactionId}</span></p>
              <p className="bg-muted/40 p-2.5 rounded border border-border text-primary technical-value-wrap text-[11px]">
                SHA-256 record digest: {receipt.receiptHash || "Not returned"}
              </p>
            </div>
            <div className="responsive-modal-footer">
              <button
                onClick={() => { window.print(); setReceipt(null); }}
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
