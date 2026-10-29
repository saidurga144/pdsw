"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Activity, AlertTriangle, Cpu, FileWarning, ShieldAlert } from "lucide-react";
import Link from "next/link";

type FeedState = { events: any[] | null; alerts: any[] | null; incidents: any[] | null; errors: string[]; loading: boolean };

async function readArray(url: string, key: string): Promise<any[]> {
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data.success || !Array.isArray(data[key])) {
    throw new Error(data.error || data.detail || `Unable to load ${key}.`);
  }
  return data[key];
}

export default function SOCSecurityDashboard() {
  const { user } = useAuthStore();
  const [feed, setFeed] = useState<FeedState>({ events: null, alerts: null, incidents: null, errors: [], loading: true });

  useEffect(() => {
    let active = true;
    async function loadFeeds() {
      const results = await Promise.allSettled([
        readArray("/api/soc/events?limit=100", "events"),
        readArray("/api/soc/alerts?limit=100", "alerts"),
        readArray("/api/soc/incidents", "incidents"),
      ]);
      if (!active) return;
      const errors: string[] = [];
      const values = results.map((result, index) => {
        if (result.status === "fulfilled") return result.value;
        errors.push(result.reason instanceof Error ? result.reason.message : `Feed ${index + 1} unavailable.`);
        return null;
      });
      setFeed({ events: values[0], alerts: values[1], incidents: values[2], errors, loading: false });
    }
    loadFeeds();
    return () => { active = false; };
  }, []);

  const analystId = user?.id ? `SOC-${user.id.slice(-6).toUpperCase()}` : null;
  const activeIncidents = feed.incidents?.filter((incident) => !["RESOLVED", "CLOSED"].includes(String(incident.status || "").toUpperCase()));
  const metric = (value: number | undefined) => feed.loading ? "…" : value === undefined ? "—" : value.toLocaleString();

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {analystId && <span className="border border-border bg-white px-2.5 py-1 font-mono text-xs font-semibold">{analystId}</span>}
            {user?.jurisdiction && <span className="text-sm text-muted-foreground">{user.jurisdiction}</span>}
          </div>
          <p className="eyebrow mb-1">Security operations</p>
          <h1 className="editorial-heading text-3xl text-foreground sm:text-4xl">Security overview</h1>
        </div>
        <Link href="/soc/cyber-ai" className="inline-flex min-h-11 items-center justify-center gap-2 bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Open analysis tools <Cpu className="size-4" /></Link>
      </header>

      {feed.errors.length > 0 && <div role="alert" className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">Some security data could not be loaded: {feed.errors.join(" ")}</div>}

      <section aria-label="Security records returned by current feeds" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Events returned" value={metric(feed.events?.length)} description="Latest event feed response" icon={Activity} />
        <StatsCard title="Alerts returned" value={metric(feed.alerts?.length)} description="Latest alert feed response" icon={AlertTriangle} />
        <StatsCard title="Open incidents" value={metric(activeIncidents?.length)} description="Based on current incident statuses" icon={ShieldAlert} />
        <StatsCard title="Risk analysis" value="Open" description="Analysis tools available" icon={Cpu} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-base font-semibold"><FileWarning className="size-4 text-primary" />Security alerts</h2>
            <Link href="/soc/events" className="text-sm font-semibold text-primary hover:underline">View event log</Link>
          </div>
          <div className="p-5">
            {feed.alerts === null ? <p className="text-sm text-muted-foreground">Alert data is unavailable.</p> : feed.alerts.length === 0 ? <p className="text-sm text-muted-foreground">No alert records were returned by the current feed.</p> : (
              <ul className="divide-y divide-border">
                {feed.alerts.slice(0, 5).map((alert, index) => <li key={alert.id || alert._id || index} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0"><span className="min-w-0 text-sm font-medium text-foreground">{alert.title || alert.message || alert.event_type || "Security alert"}</span><span className="border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">{alert.severity || alert.status || "Unclassified"}</span></li>)}
              </ul>
            )}
          </div>
        </div>

        <div className="border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-base font-semibold"><Activity className="size-4 text-primary" />Recent security events</h2>
            <Link href="/soc/events" className="text-sm font-semibold text-primary hover:underline">Open event log</Link>
          </div>
          <div className="p-5">
            {feed.events === null ? <p className="text-sm text-muted-foreground">Event data is unavailable.</p> : feed.events.length === 0 ? <p className="text-sm text-muted-foreground">No event records were returned by the current feed.</p> : (
              <ul className="divide-y divide-border">
                {feed.events.slice(0, 5).map((event, index) => <li key={event.id || event._id || index} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0"><span className="min-w-0 text-sm font-medium text-foreground">{event.event_type || event.eventType || event.action || "Security event"}</span><span className="text-xs text-muted-foreground">{event.timestamp ? new Date(event.timestamp).toLocaleString() : ""}</span></li>)}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
