"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/services/api/client";
import { AlertCircle, Loader2, RefreshCw, Shield } from "lucide-react";

type RolePolicy = { role: string; title: string; dashboard: string; provisioning: string };

export default function RolePermissionManagementPage() {
  const [roles, setRoles] = useState<RolePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await apiClient.get("/admin/roles"); setRoles(Array.isArray(response.data?.roles) ? response.data.roles : []); }
    catch (cause) { setRoles([]); setError(cause instanceof Error ? cause.message : "Role policies could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4"><div><h1 className="text-xl font-bold text-foreground">Role-Based Access Policies</h1><p className="mt-1 text-xs text-muted-foreground">Role names, dashboard routes, and account provisioning sources from the backend role registry.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-border px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-50"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</button></header>
    {error && <div role="alert" className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="size-4" />{error}</div>}
    <div className="border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950"><strong>Enforced access policy.</strong> API permissions are enforced by FastAPI route guards. This view is read-only; changing a role or its permissions requires a code and security review.</div>
    {loading ? <div className="border border-border bg-card p-10 text-center text-muted-foreground"><Loader2 className="mx-auto mb-3 size-6 animate-spin" />Loading role registry…</div> : roles.length === 0 ? <div className="border border-border bg-card p-10 text-center text-sm text-muted-foreground">No role definitions were returned.</div> : <div className="grid gap-4 md:grid-cols-2">{roles.map((item) => <article key={item.role} className="space-y-3 border border-border bg-card p-5"><div className="flex items-center gap-3"><span className="rounded-full border border-border bg-secondary p-2 text-primary"><Shield className="size-5" /></span><div><h2 className="font-bold text-foreground">{item.title}</h2><p className="font-mono text-xs text-muted-foreground">{item.role}</p></div></div><dl className="space-y-2 border-t border-border pt-3 text-xs"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Dashboard</dt><dd className="font-mono text-foreground">{item.dashboard}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Provisioning</dt><dd className="text-right font-semibold text-foreground">{item.provisioning.replaceAll("_", " ")}</dd></div></dl></article>)}</div>}
  </div>;
}
