"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/services/api/client";
import { AlertCircle, Cpu, Loader2, RefreshCw, ShieldAlert } from "lucide-react";

type RiskAlert = { id: string; severity: string; title: string; description: string; beneficiaryId: string | null; sourceType: string; sourceId: string | null; status: string; createdAt: string | null };

export default function AIIntelligencePage() {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await apiClient.get("/admin/alerts"); setAlerts(Array.isArray(response.data?.alerts) ? response.data.alerts : []); }
    catch (cause) { setAlerts([]); setError(cause instanceof Error ? cause.message : "Risk alerts could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const openCount = alerts.filter((alert) => alert.status === "OPEN").length;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4"><div><h1 className="flex items-center gap-2 text-xl font-bold text-foreground"><Cpu className="size-5 text-primary" />Risk & Security Alerts</h1><p className="mt-1 text-xs text-muted-foreground">Persisted alert records. No automated model assessment is claimed by this page.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-border px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-50"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</button></header>
    {error && <div role="alert" className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="size-4" />{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2"><div className="border border-border bg-card p-5"><p className="text-xs font-semibold uppercase text-muted-foreground">Persisted alerts</p><p className="mt-1 font-mono text-2xl font-bold text-foreground">{alerts.length}</p></div><div className="border border-border bg-card p-5"><p className="text-xs font-semibold uppercase text-muted-foreground">Open alerts</p><p className="mt-1 font-mono text-2xl font-bold text-primary">{openCount}</p></div></div>
    {loading ? <div className="border border-border bg-card p-10 text-center text-muted-foreground"><Loader2 className="mx-auto mb-3 size-6 animate-spin" />Loading stored alert records…</div> : alerts.length === 0 ? <section className="border border-border bg-card p-12 text-center"><ShieldAlert className="mx-auto mb-3 size-7 text-primary" /><h2 className="font-semibold text-foreground">No alert records found</h2><p className="mt-1 text-sm text-muted-foreground">No risk alert records have been persisted in the database.</p></section> : <div className="space-y-3">{alerts.map((alert) => <article key={alert.id} className="space-y-2 border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs text-muted-foreground">{alert.id}</p><h2 className="mt-1 font-semibold text-foreground">{alert.title}</h2></div><span className="rounded-full border border-border px-3 py-1 text-xs font-semibold">{alert.severity} · {alert.status}</span></div><p className="text-sm text-muted-foreground">{alert.description}</p><p className="text-xs text-muted-foreground">{alert.beneficiaryId ? `Beneficiary ${alert.beneficiaryId}` : "System"} · {alert.sourceType}{alert.sourceId ? ` ${alert.sourceId}` : ""}{alert.createdAt ? ` · ${new Date(alert.createdAt).toLocaleString()}` : ""}</p></article>)}</div>}
  </div>;
}
