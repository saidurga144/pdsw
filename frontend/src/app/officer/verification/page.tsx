"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/services/api/client";
import { AlertCircle, CheckCircle2, Clock3, Loader2, PackageOpen, XCircle } from "lucide-react";

type VerificationRecord = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  rationCardNumber: string | null;
  category: string | null;
  address: Record<string, string>;
  submittedAt: string | null;
};
type VerificationHistory = { id: string; beneficiaryId: string; status: string; comments: string; reviewedAt: string | null };

export default function VerificationQueuePage() {
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [history, setHistory] = useState<VerificationHistory[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/officer/verification");
      setRecords(Array.isArray(response.data?.records) ? response.data.records : []);
      setHistory(Array.isArray(response.data?.history) ? response.data.history : []);
    } catch (cause) {
      setRecords([]);
      setHistory([]);
      setError(cause instanceof Error ? cause.message : "Could not load the verification queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadQueue(); }, [loadQueue]);

  const decide = async (record: VerificationRecord, status: "VERIFIED" | "REJECTED") => {
    const comment = (comments[record.id] || "").trim();
    if (!comment) {
      setError("Enter review comments before approving or rejecting an account.");
      return;
    }
    setSavingId(record.id);
    setError("");
    setNotice("");
    try {
      await apiClient.patch(`/officer/verification/${encodeURIComponent(record.id)}`, { status, comments: comment });
      setNotice(`Beneficiary ${status === "VERIFIED" ? "verified" : "rejected"}.`);
      await loadQueue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The verification decision was not saved.");
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-4">
        <h1 className="text-xl font-bold text-foreground">Beneficiary Verification Queue</h1>
        <p className="text-xs text-muted-foreground">Review pending applications assigned to your officer account.</p>
      </header>
      {error && <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="size-4" />{error}</div>}
      {notice && <div role="status" className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      {loading ? (
        <div className="rounded-md border border-border bg-card p-12 text-center text-muted-foreground"><Loader2 className="mx-auto mb-3 size-6 animate-spin text-primary" />Loading assigned applications…</div>
      ) : records.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-12 text-center shadow-subtle">
          <PackageOpen className="mx-auto mb-3 size-7 text-primary" />
          <h2 className="font-semibold text-foreground">No pending applications</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">There are no beneficiary accounts awaiting your verification.</p>
        </div>
      ) : records.map((record) => (
        <article key={record.id} className="space-y-4 rounded-md border border-border bg-card p-5 shadow-subtle">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
            <div><p className="font-mono text-xs font-bold text-primary">{record.id}</p><h2 className="mt-1 font-semibold text-foreground">{record.fullName || "Name not recorded"}</h2><p className="text-xs text-muted-foreground">{record.email}{record.phone ? ` · ${record.phone}` : ""}</p></div>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"><Clock3 className="size-3.5" /> Pending</span>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-muted-foreground">Ration card</dt><dd className="font-medium">{record.rationCardNumber || "Not recorded"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Category</dt><dd className="font-medium">{record.category || "Not configured"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">District</dt><dd className="font-medium">{record.address?.district || "Not recorded"}</dd></div>
          </dl>
          <div><label htmlFor={`review-${record.id}`} className="mb-1 block text-xs font-semibold text-foreground">Review comments (required)</label><textarea id={`review-${record.id}`} value={comments[record.id] || ""} onChange={(event) => setComments((current) => ({ ...current, [record.id]: event.target.value }))} rows={2} maxLength={2000} className="w-full rounded-md border border-border bg-background p-2.5 text-sm text-foreground" placeholder="Record the basis for this verification decision" /></div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
            <button type="button" disabled={Boolean(savingId)} onClick={() => void decide(record, "REJECTED")} className="inline-flex items-center gap-2 rounded-md border border-destructive/30 px-4 py-2 text-xs font-semibold text-destructive disabled:opacity-50"><XCircle className="size-4" />Reject</button>
            <button type="button" disabled={Boolean(savingId)} onClick={() => void decide(record, "VERIFIED")} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{savingId === record.id ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}Verify account</button>
          </div>
        </article>
      ))}
      <section className="space-y-3 rounded-md border border-border bg-card p-5 shadow-subtle">
        <div className="flex items-center justify-between border-b border-border pb-3"><h2 className="font-semibold text-foreground">Verification history</h2><span className="text-xs text-muted-foreground">{history.length} recent decisions</span></div>
        {history.length === 0 ? <p className="text-sm text-muted-foreground">No verification decisions have been recorded for your assigned beneficiaries.</p> : <div className="space-y-3">{history.map((item) => <article key={item.id} className="flex flex-col gap-2 border-b border-border pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-mono text-xs text-primary">{item.beneficiaryId}</p><p className="mt-1 text-sm text-foreground">{item.comments}</p></div><div className="shrink-0 text-xs text-muted-foreground"><span className={item.status === "VERIFIED" ? "font-semibold text-emerald-700" : "font-semibold text-destructive"}>{item.status}</span>{item.reviewedAt ? ` · ${new Date(item.reviewedAt).toLocaleString()}` : ""}</div></article>)}</div>}
      </section>
    </div>
  );
}
