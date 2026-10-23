'use client';

import React from 'react';
import { Cpu, Lock, ShieldCheck, Database, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export const PlatformPillars: React.FC = () => {
  const pillars = [
    {
      title: 'AI Intelligence',
      subtitle: 'Detect Anomalies & Fraud',
      desc: 'Continuous machine learning behavioral analysis detects suspicious multi-attribute changes, ghost card patterns, and volume spikes.',
      icon: Cpu,
      badge: 'ML Risk Engine',
      link: '/admin/ai-intelligence',
    },
    {
      title: 'Privacy First',
      subtitle: 'Zero-Knowledge Protection',
      desc: 'Citizen Aadhaar and biometric hashes are cryptographically obfuscated. Identity records are verifiable without exposing raw private credentials.',
      icon: Lock,
      badge: 'ZK Cryptography',
      link: '/about',
    },
    {
      title: 'Data Integrity',
      subtitle: 'SHA-256 Hash Verification',
      desc: 'Every lifecycle change computes a mathematical state hash. Silent database corruption and unauthorized direct edits are immediately flagged.',
      icon: ShieldCheck,
      badge: 'State Anchoring',
      link: '/admin/integrity',
    },
    {
      title: 'IPFS Provenance',
      subtitle: 'Decentralized Audit Ledger',
      desc: 'Audit records and distribution receipts are pinned to an immutable IPFS DAG ledger, providing tamper-evident forensic non-repudiation.',
      icon: Database,
      badge: 'Content-Addressed DAG',
      link: '/admin/ipfs',
    },
  ];

  return (
    <section id="pillars" className="py-12 border-t border-border bg-background scroll-mt-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground bg-secondary px-3 py-1 rounded-md border border-border">
            Core Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
            Four Pillars of PDS Security
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Engineered to ensure zero trust, complete transparency, and immutable accountability across public welfare delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="relative rounded-md border border-border bg-card p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-card hover:border-primary/50"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-md bg-secondary/50 border border-border text-primary">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                      {p.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-foreground">{p.title}</h3>
                  <p className="text-xs font-semibold text-primary mb-2 font-mono">{p.subtitle}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
