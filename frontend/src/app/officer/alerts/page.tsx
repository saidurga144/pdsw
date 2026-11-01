"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/services/api/client";
import { AlertCircle, Check, Clock3, Loader2, ShieldAlert } from "lucide-react";

type AlertItem = { id: string; severity: string; title: string; description: string; beneficiaryId: string | null; sourceType: string; sourceId: string | null; status: string; createdAt: string | null };

export default function OfficerAlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/officer/alerts");
      setAlerts(Array.isArray(response.data?.alerts) ? response.data.alerts : []);
    } catch (cause) {
      setAlerts([]);
      setError(cause instanceof Error ? cause.message : "Could not load field alerts.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const acknowledge = async (alertId: string) => {
    setBusyId(alertId);
    setError("");
    try {
      await apiClient.patch(`/officer/alerts/${encodeURIComponent(alertId)}`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Alert acknowledgement was not saved.");
    } finally { setBusyId(""); }
  };

  return (
    <div className="space-y-7">
      <header className="border-b border-border pb-5">
        <p className="eyebrow mb-1">Officer workspace</p>
        <h1 className="editorial-heading text-3xl text-foreground sm:text-4xl">Field risk alerts</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Review alerts recorded for beneficiaries assigned to your officer account.</p>
      </header>
      {error && <div role="alert" className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="size-4" />{error}</div>}
      {loading ? <div className="border border-border bg-white p-12 text-center text-muted-foreground"><Loader2 className="mx-auto mb-3 size-6 animate-spin" />Loading recorded alerts…</div> : alerts.length === 0 ? (
        <section className="flex min-h-[320px] flex-col items-center justify-center border border-border bg-white px-6 py-12 text-center">
          <div className="mb-5 flex size-12 items-center justify-center rounded-full border border-border bg-background"><ShieldAlert className="size-5 text-primary" /></div>
          <h2 className="text-lg font-semibold text-foreground">No recorded field alerts</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">There are no persisted alerts for beneficiaries assigned to your account.</p>
        </section>
      ) : alerts.map((alert) => (
        <article key={alert.id} className="space-y-3 border border-border bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 size-5 text-primary" /><div><h2 className="font-semibold text-foreground">{alert.title}</h2><p className="mt-1 text-sm text-muted-foreground">{alert.description}</p></div></div>
            <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold">{alert.severity} · {alert.status}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
            <span>{alert.beneficiaryId ? `Beneficiary ${alert.beneficiaryId}` : "System alert"} · {alert.sourceType}{alert.sourceId ? ` ${alert.sourceId}` : ""}{alert.createdAt ? ` · ${new Date(alert.createdAt).toLocaleString()}` : ""}</span>
            {alert.status === "OPEN" ? <button type="button" disabled={Boolean(busyId)} onClick={() => void acknowledge(alert.id)} className="inline-flex items-center gap-2 border border-border px-3 py-2 font-semibold text-foreground disabled:opacity-50">{busyId === alert.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Acknowledge</button> : <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" />Acknowledged</span>}
          </div>
        </article>
      ))}
    </div>
  );
}
