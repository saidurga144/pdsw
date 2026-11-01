"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/services/api/client";
import { Activity, AlertCircle, ArrowRight, Building2, CheckCircle2, Loader2, MapPin, PackageOpen, RefreshCw, XCircle } from "lucide-react";

type MigrationRequest = {
  id: string;
  beneficiary_id: string;
  beneficiary_name?: string;
  request_type: string;
  previous_data?: Record<string, unknown>;
  requested_data?: Record<string, unknown>;
  reason?: string;
  status: string;
  submitted_at?: string | null;
};

function safeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(safeJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, /aadhaar|uid|identity/i.test(key) ? "[masked]" : safeJson(child)]));
}

export default function MigrationTransferPage() {
  const [requests, setRequests] = useState<MigrationRequest[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/officer/requests");
      const rows = Array.isArray(response.data?.requests) ? response.data.requests : [];
      setRequests(rows.filter((row: MigrationRequest) => ["MIGRATION_TRANSFER", "ONORC_MIGRATION"].includes(String(row.request_type).toUpperCase())));
    } catch (cause) {
      setRequests([]);
      setError(cause instanceof Error ? cause.message : "Could not load migration requests.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const review = async (request: MigrationRequest, status: "APPROVED" | "REJECTED") => {
    const reviewNotes = (comments[request.id] || "").trim();
    if (!reviewNotes) { setError("Add review notes before updating a migration request."); return; }
    setBusyId(request.id); setError(""); setNotice("");
    try {
      await apiClient.post(`/officer/requests/${encodeURIComponent(request.id)}/review`, { status, reviewNotes });
      setNotice(`Migration request ${status.toLowerCase()}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Migration review could not be saved.");
    } finally { setBusyId(""); }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div><h1 className="text-xl font-bold text-foreground">Inter-District Migration & FPS Center Transfer</h1><p className="text-xs text-muted-foreground">Review real migration requests assigned to your officer account.</p></div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-50"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>
      </header>
      {error && <div role="alert" className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="size-4" />{error}</div>}
      {notice && <div role="status" className="border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      {loading ? <div className="border border-border bg-card p-12 text-center text-muted-foreground"><Loader2 className="mx-auto mb-3 size-6 animate-spin" />Loading migration requests…</div> : requests.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center border border-border bg-card p-10 text-center">
          <PackageOpen className="mb-3 size-7 text-primary" />
          <h2 className="font-semibold text-foreground">No migration requests in your queue</h2>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">Migration requests submitted by beneficiaries assigned to you will appear here.</p>
        </div>
      ) : requests.map((request) => (
        <article key={request.id} className="space-y-4 border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3"><div><p className="font-mono text-xs font-bold text-primary">{request.id}</p><h2 className="mt-1 font-semibold text-foreground">{request.beneficiary_name || request.beneficiary_id}</h2><p className="text-xs text-muted-foreground">Submitted {request.submitted_at ? new Date(request.submitted_at).toLocaleString() : "date unavailable"}</p></div><span className="rounded-full border border-border px-3 py-1 text-xs font-semibold">{request.status}</span></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-border bg-background p-3"><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><MapPin className="size-4" />Current details</p><pre className="whitespace-pre-wrap break-words text-xs text-foreground">{JSON.stringify(safeJson(request.previous_data || {}), null, 2)}</pre></div>
            <div className="border border-border bg-background p-3"><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><Building2 className="size-4" />Requested destination</p><pre className="whitespace-pre-wrap break-words text-xs text-foreground">{JSON.stringify(safeJson(request.requested_data || {}), null, 2)}</pre></div>
          </div>
          {request.reason && <p className="text-sm text-muted-foreground">Reason: {request.reason}</p>}
          <label className="block text-xs font-semibold text-foreground">Review notes (required)<textarea value={comments[request.id] || ""} onChange={(event) => setComments((current) => ({ ...current, [request.id]: event.target.value }))} rows={2} maxLength={2000} className="mt-1 w-full border border-border bg-background p-2.5 text-sm" /></label>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3"><button type="button" disabled={Boolean(busyId)} onClick={() => void review(request, "REJECTED")} className="inline-flex items-center gap-2 border border-destructive/30 px-4 py-2 text-xs font-semibold text-destructive disabled:opacity-50"><XCircle className="size-4" />Reject</button><button type="button" disabled={Boolean(busyId)} onClick={() => void review(request, "APPROVED")} className="inline-flex items-center gap-2 bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{busyId === request.id ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}Approve transfer <ArrowRight className="size-4" /></button></div>
        </article>
      ))}
    </div>
  );
}
