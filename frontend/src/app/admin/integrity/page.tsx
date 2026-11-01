"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/services/api/client";
import { AlertCircle, FileText, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

type Evidence = { id: string; userId: string; documentId: string; cid?: string | null; fileHash?: string | null; transactionHash?: string | null; role: string; status: string; createdAt?: string | null };

export default function AdminIntegrityPage() {
  const [records, setRecords] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await apiClient.get("/admin/integrity"); setRecords(Array.isArray(response.data?.records) ? response.data.records : []); }
    catch (cause) { setRecords([]); setError(cause instanceof Error ? cause.message : "Integrity evidence could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const anchored = records.filter((record) => record.cid && record.fileHash).length;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4"><div><h1 className="flex items-center gap-2 text-xl font-bold text-foreground"><ShieldCheck className="size-5 text-primary" />Document Integrity Evidence</h1><p className="mt-1 text-xs text-muted-foreground">Persisted document audit entries; no tamper-free status is inferred without a trusted baseline.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-border px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-50"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</button></header>
    {error && <div role="alert" className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="size-4" />{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2"><div className="border border-border bg-card p-5"><p className="text-xs font-semibold uppercase text-muted-foreground">Document audit records</p><p className="mt-1 font-mono text-2xl font-bold text-foreground">{records.length}</p></div><div className="border border-border bg-card p-5"><p className="text-xs font-semibold uppercase text-muted-foreground">Records with CID and digest</p><p className="mt-1 font-mono text-2xl font-bold text-primary">{anchored}</p></div></div>
    {loading ? <div className="border border-border bg-card p-10 text-center text-muted-foreground"><Loader2 className="mx-auto mb-3 size-6 animate-spin" />Loading evidence records…</div> : records.length === 0 ? <section className="border border-border bg-card p-10 text-center"><FileText className="mx-auto mb-3 size-7 text-primary" /><h2 className="font-semibold text-foreground">No document audit records</h2><p className="mt-1 text-sm text-muted-foreground">No supporting document records are currently persisted.</p></section> : <div className="overflow-x-auto border border-border bg-card"><table className="w-full min-w-[800px] text-left text-xs"><thead className="bg-muted/50 text-muted-foreground"><tr>{["DOCUMENT", "USER", "ROLE", "STATUS", "IPFS CID", "SHA-256", "TRANSACTION", "RECORDED"].map((label) => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{records.map((record) => <tr key={record.id} className="border-t border-border"><td className="px-3 py-3 font-mono">{record.documentId}</td><td className="px-3 py-3 font-mono">{record.userId}</td><td className="px-3 py-3">{record.role}</td><td className="px-3 py-3">{record.status}</td><td className="max-w-[180px] break-all px-3 py-3 font-mono">{record.cid || "Not recorded"}</td><td className="max-w-[180px] break-all px-3 py-3 font-mono">{record.fileHash || "Not recorded"}</td><td className="max-w-[150px] break-all px-3 py-3 font-mono">{record.transactionHash || "Not recorded"}</td><td className="px-3 py-3">{record.createdAt ? new Date(record.createdAt).toLocaleString() : "Not recorded"}</td></tr>)}</tbody></table></div>}
  </div>;
}
