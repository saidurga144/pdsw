"use client";

import React from "react";
import { ArrowRight, ClipboardCheck, FilePlus2, Fingerprint, ShieldCheck } from "lucide-react";

const steps = [
  { number: "01", title: "Sign in", text: "The account is authenticated and access is checked against its assigned role.", icon: Fingerprint },
  { number: "02", title: "Complete a service", text: "Beneficiaries submit supported requests; officers review or record distribution activity.", icon: FilePlus2 },
  { number: "03", title: "Review the record", text: "Authorized users can follow the relevant profile, request, transaction, or audit view.", icon: ClipboardCheck },
  { number: "04", title: "Check integrity", text: "Integrity workflows expose available hash, document, or blockchain evidence when configured.", icon: ShieldCheck },
];

export const SystemWorkflow: React.FC = () => (
  <div className="mx-auto max-w-[1280px]">
    <div className="mb-12 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
      <div>
        <p className="eyebrow mb-4">How it works</p>
        <h2 className="editorial-heading max-w-xl text-4xl leading-tight text-foreground sm:text-5xl">A clear path from service to review.</h2>
      </div>
      <p className="max-w-2xl text-sm leading-7 text-muted-foreground">The interface follows the application’s current account, request, distribution, and integrity workflows. External evidence services depend on their environment configuration.</p>
    </div>
    <div className="grid border-l border-t border-border sm:grid-cols-2 lg:grid-cols-4">
      {steps.map(({ number, title, text, icon: Icon }, index) => (
        <article key={number} className="relative min-h-56 border-b border-r border-border bg-white p-6 sm:p-7">
          <div className="mb-10 flex items-center justify-between">
            <span className="font-mono text-sm font-semibold text-primary">{number}</span>
            <Icon className="size-5 text-foreground" strokeWidth={1.7} aria-hidden="true" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{text}</p>
          {index < steps.length - 1 && <ArrowRight className="absolute right-3 top-1/2 hidden size-4 translate-x-1/2 text-primary lg:block" aria-hidden="true" />}
        </article>
      ))}
    </div>
  </div>
);
