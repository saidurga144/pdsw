"use client";

import React, { useState, useEffect } from "react";
import { Distribution } from "@/types";
import { useAuthStore } from "@/stores/auth.store";
import { apiClient } from "@/services/api/client";
import {
  Search,
  CheckCircle2,
  ShieldCheck,
  History,
  ExternalLink,
  PackageOpen,
  Loader2,
  Printer,
  AlertCircle,
} from "lucide-react";

export default function BeneficiaryTransactionsPage() {
  const { user } = useAuthStore();
  const [selectedTxn, setSelectedTxn] = useState<Distribution | null>(null);
  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function fetchTransactions() {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        setLoadError("");
        const res = await apiClient.get(
          "/beneficiary/transactions",
        );
        if (res.data?.success && Array.isArray(res.data.transactions)) {
          setTransactions(res.data.transactions);
        } else {
          throw new Error(res.data?.detail || res.data?.error || "Distribution history could not be loaded.");
        }
      } catch (cause) {
        setTransactions([]);
        setLoadError(cause instanceof Error ? cause.message : "Distribution history could not be loaded.");
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [user?.id]);

  const filtered = transactions.filter(
    (d) =>
      d.transactionId?.toLowerCase().includes(search.toLowerCase()) ||
      d.pdsCenterId?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="ben-title text-foreground">
            Distribution Receipts & Transaction History
          </h1>
          <p className="text-xs text-muted-foreground">
            View completed distribution records and their stored SHA-256 receipt digests. IPFS is shown only when a receipt has actually been pinned.
          </p>
        </div>

        {transactions.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="size-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter Transaction ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
        )}
      </div>

      {loadError && <div role="alert" className="flex items-start gap-2 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" />{loadError}</div>}

      {loading ? (
        <div className="bg-card border border-border rounded-md p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-xs">Loading transaction history...</span>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-card border border-border rounded-md p-12 text-center space-y-3 shadow-subtle">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-primary border border-border">
            <PackageOpen className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="empty-state-title text-foreground uppercase">
              No Distribution History
            </h3>
            <p className="empty-state-description text-muted-foreground max-w-sm mx-auto">
              No ration distributions have been recorded for this beneficiary
              card yet. When you collect commodity rations from your assigned
              Fair Price Shop, authenticated distribution receipts will appear
              here.
            </p>
          </div>
        </div>
      ) : (
        /* Desktop Table View */
        <div className="bg-card border border-border rounded-md shadow-subtle responsive-table-wrap">
          <table className="responsive-table text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-mono border-b border-border">
              <tr>
                <th className="px-4 py-3">Transaction ID</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">PDS Center</th>
                <th className="px-4 py-3">Commodities</th>
                <th className="px-4 py-3">Total Paid</th>
                <th className="px-4 py-3">Confirmation</th>
                <th className="px-4 py-3 text-right">Receipt Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-primary">
                    {d.transactionId}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {new Date(d.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {d.pdsCenterId}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {d.commodities
                      ?.map((c) => `${c.quantity}${c.unit} ${c.name}`)
                      .join(", ")}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-primary">
                    ₹{d.totalAmount}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 text-primary">
                      <ShieldCheck className="size-3.5" /> {d.verificationMethod === "OFFICER_VERIFIED" ? "Officer confirmed" : d.verificationMethod === "OTP_SIMULATED" ? "OTP (simulated)" : d.verificationMethod === "BIOMETRIC_SIMULATED" ? "Biometric (simulated)" : d.verificationMethod || "Recorded"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedTxn(d)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <span>View Proof</span>
                      <ExternalLink className="size-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedTxn && (
        <div className="responsive-modal-overlay">
          <div id="pdsw-print-receipt" className="responsive-modal-panel responsive-modal-panel-sm">
            <div className="responsive-modal-header flex items-center justify-between gap-3">
              <h3 className="min-w-0 font-bold text-base">
                Cryptographic Receipt Proof
              </h3>
              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Close receipt proof"
              >
                ✕
              </button>
            </div>

            <div className="responsive-modal-body space-y-2 text-xs">
              <div className="p-3 bg-muted/40 rounded-md border border-border space-y-1">
                <p className="text-muted-foreground">
                  Transaction ID:{" "}
                  <span className="font-mono text-primary font-bold technical-value-wrap">
                    {selectedTxn.transactionId}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Beneficiary Name:{" "}
                  <span className="font-semibold text-foreground">
                    {selectedTxn.beneficiaryName}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Ration Card ID:{" "}
                  <span className="font-mono text-foreground technical-value-wrap">
                    {selectedTxn.rationCardId}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  State Hash:{" "}
                  <span className="font-mono text-primary technical-value-wrap">
                    {selectedTxn.receiptHash}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  IPFS CID:{" "}
                  <span className="font-mono text-foreground technical-value-wrap">
                    {selectedTxn.ipfsCid || "No IPFS pin recorded"}
                  </span>
                </p>
                <div className="border-t border-border pt-2">
                  <p className="mb-1 font-semibold text-foreground">Distributed commodities</p>
                  {(selectedTxn.commodities || []).map((item, index) => <p key={`${item.name}-${index}`} className="text-muted-foreground">{item.name}: {item.quantity} {item.unit} · ₹{Number(item.totalPrice ?? item.quantity * item.pricePerUnit).toFixed(2)}</p>)}
                  <p className="mt-1 font-semibold text-foreground">Total paid: ₹{Number(selectedTxn.totalAmount || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="responsive-modal-footer flex justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs font-semibold text-foreground"
              >
                <Printer className="size-4" /> Print receipt
              </button>
              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase rounded-md shadow-subtle"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`@media print { body * { visibility: hidden !important; } #pdsw-print-receipt, #pdsw-print-receipt * { visibility: visible !important; } #pdsw-print-receipt { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: none !important; border: 0 !important; box-shadow: none !important; } #pdsw-print-receipt button { display: none !important; } }`}</style>
    </div>
  );
}
