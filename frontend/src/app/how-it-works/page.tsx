'use client';

import React from 'react';
import { SystemWorkflow } from '@/components/landing/SystemWorkflow';

export default function HowItWorksPage() {
  return (
    <div className="py-6 sm:py-8 space-y-8 sm:space-y-12 bg-background min-h-[85vh]">
      <div className="text-center max-w-3xl mx-auto px-3 sm:px-4 space-y-2.5">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground bg-secondary px-3 py-1 rounded-md border border-border">
          Process & Verification Flow
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          How PDSW Protects Welfare Distribution
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          A step-by-step walkthrough of state transition hashing, IPFS decentralized DAG commits, and real-time AI risk analysis.
        </p>
      </div>

      <SystemWorkflow />
    </div>
  );
}
