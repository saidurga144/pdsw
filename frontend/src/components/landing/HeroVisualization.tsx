'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { UserCheck, ShieldCheck, Database, Cpu, Lock, CheckCircle2, ArrowDown } from 'lucide-react';
import { SecurityStatus } from './SecurityStatus';

export const HeroVisualization: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative w-full max-w-lg mx-auto flex flex-col items-center">
      <div className="relative w-full overflow-hidden rounded-[1.5rem] border border-border bg-card p-5 shadow-xl shadow-slate-200/70 space-y-4">
        <div className="absolute right-5 top-5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-primary"><span className="size-1.5 rounded-full bg-primary" /> Live ledger</div>
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2.5 rounded-full border border-primary/30 bg-red-50 px-4 py-2 text-foreground text-xs font-semibold shadow-subtle"
          >
            <UserCheck className="size-4 text-primary" />
            <span>BENEFICIARY ACTION</span>
            <span className="size-1.5 rounded-full bg-primary" />
          </motion.div>
        </div>

        <div className="flex flex-col items-center">
          <div className="h-4 w-px bg-border" />
          <ArrowDown className="size-3 text-muted-foreground -my-1" />
        </div>

        <div className="flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-5 py-2.5 text-foreground text-xs font-bold tracking-wider shadow-subtle">
            <Lock className="size-4 text-primary" />
            <span>PDS SECURE GATEWAY</span>
          </div>
        </div>

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

        <div className="grid grid-cols-3 gap-2">
          <motion.div
            animate={shouldReduceMotion ? {} : { y: [0, -2, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="flex flex-col items-center rounded-xl border border-border bg-white p-3 text-center shadow-sm transition-colors hover:border-primary/60"
          >
            <div className="p-1.5 bg-secondary/50 rounded-md text-primary mb-1">
              <Cpu className="size-4" />
            </div>
            <span className="text-[10px] font-bold text-foreground uppercase">AI Engine</span>
            <span className="text-[9px] text-muted-foreground font-mono">Risk Scan</span>
          </motion.div>

          <motion.div
            animate={shouldReduceMotion ? {} : { y: [0, -2, 0] }}
            transition={{ repeat: Infinity, duration: 4, delay: 0.6, ease: "easeInOut" }}
            className="flex flex-col items-center rounded-xl border border-border bg-white p-3 text-center shadow-sm transition-colors hover:border-primary/60"
          >
            <div className="p-1.5 bg-secondary/50 rounded-md text-primary mb-1">
              <ShieldCheck className="size-4" />
            </div>
            <span className="text-[10px] font-bold text-foreground uppercase">State Hash</span>
            <span className="text-[9px] text-muted-foreground font-mono">SHA-256</span>
          </motion.div>

          <motion.div
            animate={shouldReduceMotion ? {} : { y: [0, -2, 0] }}
            transition={{ repeat: Infinity, duration: 4, delay: 1.2, ease: "easeInOut" }}
            className="flex flex-col items-center rounded-xl border border-border bg-white p-3 text-center shadow-sm transition-colors hover:border-primary/60"
          >
            <div className="p-1.5 bg-secondary/50 rounded-md text-primary mb-1">
              <Database className="size-4" />
            </div>
            <span className="text-[10px] font-bold text-foreground uppercase">IPFS DAG</span>
            <span className="text-[9px] text-muted-foreground font-mono">CID Pinned</span>
          </motion.div>
        </div>

        <div className="flex flex-col items-center">
          <div className="h-3 w-px bg-border" />
          <ArrowDown className="size-3 text-muted-foreground -my-0.5" />
        </div>

        <div className="flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-red-50 px-4 py-2 text-foreground text-xs font-bold tracking-wider shadow-subtle">
            <CheckCircle2 className="size-4 text-primary" />
            <span>SECURE & CRYPTOGRAPHICALLY VERIFIED</span>
          </div>
        </div>

        <div className="pt-1">
          <SecurityStatus />
        </div>
      </div>
    </div>
  );
};
