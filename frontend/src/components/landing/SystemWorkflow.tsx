'use client';

import React from 'react';
import {
  UserCheck,
  Lock,
  Database,
  ShieldCheck,
  Cpu,
  FileCheck,
  Eye,
  ArrowRight
} from 'lucide-react';

export const SystemWorkflow: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'User Action',
      desc: 'Beneficiary submits update or officer releases quota.',
      icon: UserCheck,
    },
    {
      step: '02',
      title: 'Secure Validation',
      desc: 'Biometric / MFA signature & RBAC authorization verified.',
      icon: Lock,
    },
    {
      step: '03',
      title: 'Database Update',
      desc: 'Transactional update recorded within atomic state ledger.',
      icon: Database,
    },
    {
      step: '04',
      title: 'Hash Generation',
      desc: 'SHA-256 state hash generated from latest snapshot.',
      icon: ShieldCheck,
    },
    {
      step: '05',
      title: 'AI Risk Analysis',
      desc: 'Real-time behavioral scoring checks anomaly thresholds.',
      icon: Cpu,
    },
    {
      step: '06',
      title: 'IPFS Evidence',
      desc: 'Cryptographic CID proof pinned to decentralized DAG.',
      icon: FileCheck,
    },
    {
      step: '07',
      title: 'Audit Trail',
      desc: 'Non-repudiable log entry visible to CAG auditors.',
      icon: Eye,
    },
  ];

  return (
    <section id="how-it-works" className="relative border-t border-border bg-card py-20 scroll-mt-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl space-y-4 text-center">
          <span className="eyebrow">
            System Workflow
          </span>
          <h2 className="display-type text-4xl font-semibold text-foreground sm:text-5xl">
            Every action leaves a verifiable trace.
          </h2>
          <p className="text-sm leading-7 text-muted-foreground sm:text-base">
            Every transaction undergoes continuous cryptographic validation, AI risk scoring, and decentralized IPFS proof anchoring.
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="group flex flex-col justify-between bg-card p-5 transition-colors hover:bg-background"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-extrabold text-primary">
                      {item.step}
                    </span>
                    <div className="rounded-full border border-border bg-secondary/50 p-2 text-primary">
                      <Icon className="size-4" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
