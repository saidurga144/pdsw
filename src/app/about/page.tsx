'use client';

import React from 'react';
import Link from 'next/link';
import { Cpu, Database } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-12 bg-background">
      <div className="space-y-4 text-center max-w-3xl mx-auto">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground bg-secondary px-3 py-1 rounded-md border border-border">
          Architecture Whitepaper Overview
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
          About the PDSW Security Framework
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The <strong>AI-Driven Privacy-Preserving IPFS-Based Framework for Secure and Fraud-Resistant Public Distribution System</strong> is a national-scale cyber-physical welfare distribution architecture designed to protect public entitlements.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-md border border-border bg-card p-6 space-y-3 shadow-card">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Cpu className="size-5 text-primary" /> AI Behavioral Intelligence
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Machine learning models continuously evaluate distribution anomalies, ghost beneficiary clusters, and abnormal frequency spikes across fair price shops without manual human bottlenecks.
          </p>
        </div>

        <div className="rounded-md border border-border bg-card p-6 space-y-3 shadow-card">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Database className="size-5 text-primary" /> IPFS Decentralized Provenance
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Every administrative action, family modification, and commodity disbursement anchors a cryptographic content identifier (CID) onto an immutable decentralized directed acyclic graph (DAG).
          </p>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-8 text-center space-y-4 shadow-card">
        <h2 className="text-xl font-bold text-foreground">Ready to Explore the Platform?</h2>
        <p className="text-xs text-muted-foreground max-w-lg mx-auto">
          Access your authorized role portal or review the end-to-end PDS record lifecycle simulation.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider shadow-subtle"
          >
            Access Platform
          </Link>
          <Link
            href="/how-it-works"
            className="px-5 py-2.5 rounded-md border border-border bg-card hover:bg-muted/50 text-foreground font-semibold text-xs shadow-subtle"
          >
            View How It Works
          </Link>
        </div>
      </div>
    </div>
  );
}
