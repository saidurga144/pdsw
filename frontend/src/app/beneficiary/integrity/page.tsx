"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/services/api/client";
import { AlertCircle, ChevronDown, ChevronUp, FileText, Loader2, ShieldAlert } from "lucide-react";

type IntegrityDocument = { documentId: string; ipfsCid?: string | null; fileHash?: string | null; transactionHash?: string | null; recordedAt?: string | null; status?: string };
type Verification = { status: string; currentRecordHash: string; lastVerifiedAt: string | null; explanation: string; documents: IntegrityDocument[] };

export default function CitizenIntegrityPage() {
  const [verification, setVerification] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showTechnical, setShowTechnical] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await apiClient.get("/beneficiary/integrity");
      setVerification(response.data?.verification || null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load integrity evidence."); setVerification(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (loading) return <div className="flex min-h-[300px] flex-col items-center justify-center gap-3"><Loader2 className="size-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Loading saved integrity evidence…</p></div>;
  if (error || !verification) return <section className="mx-auto max-w-2xl border border-border bg-white p-10 text-center"><AlertCircle className="mx-auto mb-3 size-7 text-destructive" /><h1 className="ben-title text-foreground">Integrity data unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error || "No integrity response was returned."}</p><button onClick={() => void load()} className="mt-4 bg-primary px-4 py-2 text-sm font-semibold text-white">Retry</button></section>;
  return <div className="mx-auto max-w-3xl space-y-6 py-4">
    <header className="space-y-2 text-center"><div className="inline-flex rounded-full border border-border bg-secondary p-4 text-primary"><ShieldAlert className="size-8" /></div><h1 className="ben-title text-foreground">Citizen Record Integrity Status</h1><p className="text-xs text-muted-foreground">Current profile digest and persisted document provenance</p></header>
    <section className="space-y-5 border border-border bg-card p-6 shadow-subtle">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"><span className="font-mono text-xs font-bold text-muted-foreground">Ration card: <span className="text-foreground">Digest is calculated from the current account record</span></span><span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">{verification.status}</span></div>
      <div className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><strong>Integrity is not verified.</strong> {verification.explanation}</div>
      <div><button onClick={() => setShowTechnical((value) => !value)} className="flex w-full items-center justify-center gap-2 border border-border bg-secondary px-3 py-2.5 text-xs font-semibold text-foreground">{showTechnical ? "Hide technical details" : "Show technical details"}{showTechnical ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</button></div>
      {showTechnical && <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground">Current record SHA-256 digest (a live calculation, not an anchored comparison)</p><code className="block break-all border border-border bg-muted/40 p-3 text-xs text-foreground">{verification.currentRecordHash}</code><p className="text-xs text-muted-foreground">Last trusted comparison: {verification.lastVerifiedAt ? new Date(verification.lastVerifiedAt).toLocaleString() : "None recorded"}</p></div>}
      <div className="space-y-3 border-t border-border pt-4"><h2 className="flex items-center gap-2 text-sm font-bold text-foreground"><FileText className="size-4 text-primary" />Recorded supporting documents ({verification.documents.length})</h2>{verification.documents.length === 0 ? <p className="text-sm text-muted-foreground">No document audit records are linked to this account.</p> : verification.documents.map((doc) => <article key={doc.documentId} className="space-y-2 border border-border bg-background p-3"><p className="font-mono text-xs font-semibold text-foreground">{doc.documentId} <span className="ml-2 text-muted-foreground">{doc.status || "Recorded"}</span></p><p className="break-all text-xs text-muted-foreground">IPFS CID: {doc.ipfsCid || "Not recorded"}</p><p className="break-all text-xs text-muted-foreground">File digest: {doc.fileHash || "Not recorded"}</p><p className="text-[11px] text-muted-foreground">Recorded: {doc.recordedAt ? new Date(doc.recordedAt).toLocaleString() : "Date unavailable"}</p></article>)}</div>
    </section>
  </div>;
}
