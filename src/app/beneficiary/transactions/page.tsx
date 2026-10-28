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
} from "lucide-react";

export default function BeneficiaryTransactionsPage() {
  const { user } = useAuthStore();
  const [selectedTxn, setSelectedTxn] = useState<Distribution | null>(null);
  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTransactions() {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiClient.get(
          `/beneficiary/transactions?beneficiaryId=${encodeURIComponent(user.id)}`,
        );
        if (res.data?.success && Array.isArray(res.data.transactions)) {
          setTransactions(res.data.transactions);
        } else {
          setTransactions([]);
        }
      } catch {
        setTransactions([]);
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
          <h1 className="text-xl font-bold text-foreground">
            Distribution Receipts & Transaction History
          </h1>
          <p className="text-xs text-muted-foreground">
            View biometrically validated ration collection logs and IPFS receipt
            anchors
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
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
              No Distribution History
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
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
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3 text-right">IPFS Receipt</th>
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
                      <ShieldCheck className="size-3.5" /> Biometric Verified
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
          <div className="responsive-modal-panel responsive-modal-panel-sm">
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
                    {selectedTxn.ipfsCid}
                  </span>
                </p>
              </div>
            </div>

            <div className="responsive-modal-footer flex justify-end">
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
    </div>
  );
}
