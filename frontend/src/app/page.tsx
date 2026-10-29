"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Database, Eye, LockKeyhole, ShieldCheck } from "lucide-react";
import { HeroSection } from "@/components/landing/HeroSection";
import { OurServices } from "@/components/landing/OurServices";
import { SystemWorkflow } from "@/components/landing/SystemWorkflow";

const securityFeatures = [
  { icon: LockKeyhole, title: "Account and role access", text: "Sign-in and role checks direct each user to the tools available to their account." },
  { icon: ShieldCheck, title: "Integrity verification", text: "Verification workflows compare stored record evidence and surface integrity results." },
  { icon: Database, title: "Document provenance", text: "Where configured, document records can include IPFS references and blockchain transaction evidence." },
  { icon: Eye, title: "Reviewable activity", text: "Operational and audit views provide a place to inspect supported activity records." },
];

export default function LandingHomePage() {
  return (
    <div className="w-full bg-background">
      <HeroSection />

      <section id="about" className="scroll-mt-16 bg-white px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
        <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="eyebrow mb-4">A connected public service</p>
            <h2 className="editorial-heading max-w-lg text-4xl leading-tight text-foreground sm:text-5xl">Designed around the people and records that move welfare forward.</h2>
          </div>
          <div className="space-y-6 lg:pt-2">
            <p className="max-w-2xl text-base leading-8 text-muted-foreground">
              PDS Welfare brings beneficiary self-service, officer operations, and administrative oversight into a shared digital workspace. Each role sees its own tools, while established workflows support account updates, verification, distribution, and review.
            </p>
            <Link href="/roles" className="inline-flex items-center gap-2 border-b border-primary pb-1 text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Explore role access <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <OurServices />

      <section id="how-it-works" className="scroll-mt-16 border-y border-border bg-[#F8F8F6] px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
        <SystemWorkflow />
      </section>

      <section id="security" className="scroll-mt-16 bg-[#111D28] px-5 py-20 text-white sm:px-8 sm:py-28 lg:px-10">
        <div className="mx-auto max-w-[1280px]">
          <div className="mb-12 grid gap-6 md:grid-cols-[1fr_0.7fr] md:items-end">
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-300">Security &amp; accountability</p>
              <h2 className="editorial-heading max-w-2xl text-4xl leading-tight sm:text-5xl">Built to make the record easier to review.</h2>
            </div>
            <p className="max-w-lg text-sm leading-7 text-white/75">PDSW combines account controls with integrity and audit tools. Availability of individual evidence services depends on application configuration.</p>
          </div>
          <div className="grid border border-[#263440] sm:grid-cols-2 lg:grid-cols-4">
            {securityFeatures.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className="border-b border-[#263440] p-6 sm:border-r lg:border-b-0">
                <div className="mb-8 flex items-center justify-between">
                  <Icon className="size-5 text-orange-300" strokeWidth={1.7} />
                  <span className="font-mono text-xs text-white/60">0{index + 1}</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
                <p className="text-sm leading-6 text-white/75">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F3F0E9] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow mb-3">PDS Welfare Platform</p>
            <h2 className="editorial-heading max-w-2xl text-3xl leading-tight sm:text-4xl">Make every service easier to follow.</h2>
          </div>
          <Link href="/login" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-3 bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Sign in to continue <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
