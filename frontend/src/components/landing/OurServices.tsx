"use client";

import React from "react";
import { Building2, Cpu, FileCheck2, ShieldCheck, Users, WalletCards } from "lucide-react";

const capabilities = [
  { icon: Users, title: "Beneficiary services", description: "View profile details, family information, eligibility, requests, and distribution records." },
  { icon: FileCheck2, title: "Verification workflows", description: "Review submitted beneficiary information and change requests through officer tools." },
  { icon: Building2, title: "Distribution operations", description: "Record commodity releases and manage the operational steps available to officers." },
  { icon: ShieldCheck, title: "Integrity checks", description: "Inspect record verification results and related evidence in supported workflows." },
  { icon: WalletCards, title: "Wallet sign-in", description: "Complete the configured wallet verification step after account sign-in where required." },
  { icon: Cpu, title: "Risk review tools", description: "Use available AI-assisted analysis screens to inspect flagged records and security signals." },
];

export const OurServices: React.FC = () => (
  <section id="services" className="scroll-mt-16 bg-white px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow mb-4">Platform capabilities</p>
          <h2 className="editorial-heading max-w-2xl text-4xl leading-tight text-foreground sm:text-5xl">Tools for each step of distribution.</h2>
        </div>
        <p className="max-w-lg text-sm leading-7 text-muted-foreground">Capabilities are presented according to the application’s existing role-based workflows.</p>
      </div>
      <div className="grid border-l border-t border-border sm:grid-cols-2 lg:grid-cols-3">
        {capabilities.map(({ icon: Icon, title, description }, index) => (
          <article key={title} className="group min-h-52 border-b border-r border-border p-6 transition-colors hover:bg-[#F8F8F6] sm:p-7 lg:p-8">
            <div className="mb-8 flex items-center justify-between">
              <Icon className="size-5 text-primary" strokeWidth={1.8} aria-hidden="true" />
              <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);
