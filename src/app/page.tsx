'use client';

import React from 'react';
import { HeroSection } from '@/components/landing/HeroSection';
import { PlatformPillars } from '@/components/landing/PlatformPillars';
import { SystemWorkflow } from '@/components/landing/SystemWorkflow';
import { RoleEcosystem } from '@/components/landing/RoleEcosystem';

export default function LandingHomePage() {
  return (
    <div className="w-full bg-background">
      {/* 1. Hero Section — id="platform" (set inside HeroSection) */}
      <HeroSection />

      {/* 2. How the System Works — id="how-it-works" (set inside SystemWorkflow) */}
      <SystemWorkflow />

      {/* 3. Platform Pillars: Four Security Pillars — id="pillars" */}
      <PlatformPillars />

      {/* 4. Role Ecosystem: Portal Access Cards — id="roles" (set inside RoleEcosystem) */}
      <RoleEcosystem />

      {/* 5. About section anchor */}
      <section id="about" className="py-14 border-t border-border bg-background scroll-mt-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground bg-secondary px-3 py-1 rounded-md border border-border">
            Architecture Whitepaper
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
            About the PDSW Security Framework
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            The <strong className="text-foreground">AI-Driven Privacy-Preserving IPFS-Based Framework</strong> is a national-scale cyber-physical welfare distribution architecture combining machine learning anomaly detection, SHA-256 cryptographic state hashing, and decentralized IPFS provenance to deliver fraud-resistant, tamper-evident public distribution.
          </p>
          <div className="flex justify-center gap-3">
            <a
              href="/login"
              className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider shadow-subtle"
            >
              Access Platform
            </a>
            <a
              href="/about"
              className="px-5 py-2.5 rounded-md border border-border bg-card hover:bg-muted/50 text-foreground font-semibold text-xs shadow-subtle"
            >
              Read Full Overview
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
