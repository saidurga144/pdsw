'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { UserCheck, ShieldCheck, Database, Cpu, Lock, CheckCircle2, ArrowDown } from 'lucide-react';
import { SecurityStatus } from './SecurityStatus';

export const HeroVisualization: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative w-full max-w-lg mx-auto flex flex-col items-center">
      {/* Main interactive architecture container */}
         <div className="relative w-full overflow-hidden rounded-[1.5rem] border border-border bg-card/80 p-5 shadow-2xl shadow-black/20 backdrop-blur-sm space-y-4">
           <div className="absolute right-5 top-5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-primary"><span className="size-1.5 rounded-full bg-accent" /> Live ledger</div>
        {/* Top Node: Beneficiary / User Layer */}
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
             className="flex items-center gap-2.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-foreground text-xs font-semibold shadow-subtle"
          >
            <UserCheck className="size-4 text-primary" />
            <span>BENEFICIARY ACTION</span>
            <span className="size-1.5 rounded-full bg-primary" />
          </motion.div>
        </div>

        {/* Flow line down */}
        <div className="flex flex-col items-center">
          <div className="h-4 w-px bg-border" />
          <ArrowDown className="size-3 text-muted-foreground -my-1" />
        </div>

        {/* Middle Node: PDS Application Gateway */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-5 py-2.5 text-foreground text-xs font-bold tracking-wider shadow-subtle">
             <Lock className="size-4 text-primary" />
            <span>PDS SECURE GATEWAY</span>
          </div>
        </div>

        {/* Branching connect lines */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center">
            <div className="h-3 w-px bg-border" />
            <ArrowDown className="size-2.5 text-muted-foreground -my-0.5" />
          </div>
          <div className="flex flex-col items-center">
            <div className="h-3 w-px bg-border" />
            <ArrowDown className="size-2.5 text-muted-foreground -my-0.5" />
          </div>
          <div className="flex flex-col items-center">
            <div className="h-3 w-px bg-border" />
            <ArrowDown className="size-2.5 text-muted-foreground -my-0.5" />
          </div>
        </div>

        {/* Core Verification Triad: AI Analysis | Hash Engine | IPFS Evidence */}
        <div className="grid grid-cols-3 gap-2">
          {/* AI Analysis */}
          <motion.div
            animate={shouldReduceMotion ? {} : { y: [0, -2, 0] }}
           className="flex flex-col items-center rounded-md border border-border bg-card p-2.5 text-center shadow-subtle"
            className="flex flex-col items-center rounded-md border border-border bg-card p-2.5 text-center shadow-subtle"
          >
            <div className="p-1.5 bg-secondary/50 rounded-md text-primary mb-1">
              <Cpu className="size-4" />
            </div>
            <span className="text-[10px] font-bold text-foreground uppercase">AI Engine</span>
            <span className="text-[9px] text-muted-foreground font-mono">Risk Scan</span>
          </motion.div>

          {/* Hash Engine */}
          <motion.div
            animate={shouldReduceMotion ? {} : { y: [0, -2, 0] }}
           className="flex flex-col items-center rounded-md border border-border bg-card p-2.5 text-center shadow-subtle"
            className="flex flex-col items-center rounded-md border border-border bg-card p-2.5 text-center shadow-subtle"
          >
            <div className="p-1.5 bg-secondary/50 rounded-md text-primary mb-1">
              <ShieldCheck className="size-4" />
            </div>
            <span className="text-[10px] font-bold text-foreground uppercase">State Hash</span>
            <span className="text-[9px] text-muted-foreground font-mono">SHA-256</span>
          </motion.div>

          {/* IPFS Evidence */}
          <motion.div
            animate={shouldReduceMotion ? {} : { y: [0, -2, 0] }}
           className="flex flex-col items-center rounded-md border border-border bg-card p-2.5 text-center shadow-subtle"
            className="flex flex-col items-center rounded-md border border-border bg-card p-2.5 text-center shadow-subtle"
          >
            <div className="p-1.5 bg-secondary/50 rounded-md text-primary mb-1">
              <Database className="size-4" />
            </div>
            <span className="text-[10px] font-bold text-foreground uppercase">IPFS DAG</span>
            <span className="text-[9px] text-muted-foreground font-mono">CID Pinned</span>
          </motion.div>
        </div>

        {/* Convergence flow down */}
        <div className="flex flex-col items-center">
          <div className="h-3 w-px bg-border" />
          <ArrowDown className="size-3 text-muted-foreground -my-0.5" />
        </div>

        {/* Bottom Destination: Secure & Verified Output */}
         <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-foreground text-xs font-bold tracking-wider shadow-subtle">
          <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-secondary/50 px-4 py-2 text-foreground text-xs font-bold tracking-wider shadow-subtle">
            <CheckCircle2 className="size-4 text-primary" />
            <span>SECURE & CRYPTOGRAPHICALLY VERIFIED</span>
          </div>
        </div>

        {/* Floating Live Security Status telemetry */}
        <div className="pt-1">
          <SecurityStatus />
        </div>
      </div>
    </div>
  );
};
