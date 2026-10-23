'use client';

import React from 'react';
import { ShieldCheck, Cpu, Database, Activity } from 'lucide-react';

export const SecurityStatus: React.FC = () => {
  return (
    <div className="rounded-md border border-border bg-card p-3.5 shadow-subtle text-xs font-mono">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans flex items-center gap-1.5">
          <Activity className="size-3 text-primary" />
          Live Platform Telemetry
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-foreground bg-secondary px-2 py-0.5 rounded font-sans font-medium">
          <span className="size-1.5 rounded-full bg-primary" />
          ONLINE
        </span>
      </div>

      <div className="space-y-2 text-[11px]">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Cpu className="size-3 text-primary" /> AI Anomaly Engine
          </span>
          <span className="text-foreground font-semibold">MONITORING ACTIVE</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <ShieldCheck className="size-3 text-primary" /> SHA-256 Hash Lock
          </span>
          <span className="text-primary font-semibold">100% VERIFIED</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Database className="size-3 text-primary" /> IPFS Provenance DAG
          </span>
          <span className="text-foreground font-semibold">PINNED & ANCHORED</span>
        </div>
      </div>
    </div>
  );
};
