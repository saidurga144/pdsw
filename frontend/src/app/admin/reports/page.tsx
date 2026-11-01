"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/services/api/client";
import { AlertCircle, Download, FileSpreadsheet, Loader2, RefreshCw } from "lucide-react";

type Stats = { users: Record<string, number>; activeUsers: number; inactiveUsers: number; totalUsers: number; requestsByStatus: Record<string, number>; completedDistributions: number; totalAuditEvents: number; recentRequests: Array<Record<string, unknown>> };
type Report = { id: string; title: string; description: string; rows: Array<[string, string | number]> };
function csvCell(value: string | number) { return `"${String(value).replaceAll('"', '""')}"`; }

export default function ReportsAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await apiClient.get("/admin/stats"); if (!response.data?.success || !response.data?.stats) throw new Error("The reports service returned no summary data."); setStats(response.data.stats); }
    catch (cause) { setStats(null); setError(cause instanceof Error ? cause.message : "Reports could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const reports: Report[] = stats ? [
    { id: "accounts", title: "User Account Summary", description: "Stored account totals by role and status.", rows: [["Total accounts", stats.totalUsers], ["Active accounts", stats.activeUsers], ["Inactive accounts", stats.inactiveUsers], ...Object.entries(stats.users).map(([role, count]) => [role, count] as [string, number])] },
    { id: "requests", title: "Change Request Status Summary", description: "Persisted requests grouped by their current review status.", rows: Object.entries(stats.requestsByStatus).sort(([a], [b]) => a.localeCompare(b)).map(([status, count]) => [status, count]) },
    { id: "distribution", title: "Distribution Summary", description: "Completed distribution count currently stored in the platform.", rows: [["Completed distributions", stats.completedDistributions]] },
    { id: "audit", title: "Audit Event Summary", description: "Persisted audit event count available to the application.", rows: [["Audit events", stats.totalAuditEvents]] },
    { id: "recent", title: "Recent Change Requests", description: "Most recent request records returned by the reporting endpoint (up to 10).", rows: stats.recentRequests.map((row) => [`${row.id || "Request"} · ${row.beneficiaryName || row.beneficiaryId || ""}`, `${row.type || ""} · ${row.status || ""} · ${row.submittedAt || ""}`]) },
  ] : [];

  const exportReport = (report: Report) => {
    const csv = [["Field", "Value"], ...report.rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `pdsw-${report.id}-report.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4"><div><h1 className="text-xl font-bold text-foreground">Reports & Export Analytics</h1><p className="mt-1 text-xs text-muted-foreground">Operational summaries loaded from the application database.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-border px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-50"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</button></header>
    {error && <div role="alert" className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="size-4" />{error}</div>}
    {loading ? <div className="border border-border bg-card p-10 text-center text-muted-foreground"><Loader2 className="mx-auto mb-3 size-6 animate-spin" />Loading operational data…</div> : !stats ? <div className="border border-border bg-card p-10 text-center text-sm text-muted-foreground">Reports are unavailable until the stats service responds.</div> : <div className="grid gap-4 md:grid-cols-2">{reports.map((report) => <article key={report.id} className="space-y-3 border border-border bg-card p-5"><span className="inline-flex items-center gap-2 rounded border border-border bg-muted/40 px-2 py-1 text-[10px] font-mono font-bold uppercase text-primary"><FileSpreadsheet className="size-3.5" />Database report</span><h2 className="font-bold text-foreground">{report.title}</h2><p className="text-xs text-muted-foreground">{report.description}</p><button type="button" disabled={report.rows.length === 0} onClick={() => exportReport(report)} className="inline-flex items-center gap-2 border border-border px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-50"><Download className="size-4" />Download CSV</button><p className="text-[11px] text-muted-foreground">{report.rows.length} rows</p></article>)}</div>}
  </div>;
}
