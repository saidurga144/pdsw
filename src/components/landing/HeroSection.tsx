"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Activity, Lock } from "lucide-react";
import { HeroVisualization } from "./HeroVisualization";

export const HeroSection: React.FC = () => {
  const dynamicKeywords = [
    "AI-Driven",
    "Privacy-Preserving",
    "Tamper-Evident",
    "Fraud-Resistant",
  ];

  const [keywordIndex, setKeywordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setKeywordIndex((prev) => (prev + 1) % dynamicKeywords.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [dynamicKeywords.length]);

  return (
    <section
      id="platform"
      className="surface-grid relative w-full overflow-hidden border-b border-border bg-background py-14 md:py-24 scroll-mt-14"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Column: Hero Copy & Actions */}
          <div className="reveal-up space-y-7 text-center lg:col-span-7 lg:text-left">
            <p className="eyebrow">Provenance-driven infrastructure / 2026</p>

            {/* Main Heading */}
            <h1 className="display-type text-5xl font-semibold leading-[0.94] text-foreground sm:text-6xl md:text-7xl lg:text-[6.6rem]">
              Secure. Transparent. <br className="hidden sm:block" />
              <span className="text-primary">Intelligent</span>{" "}
              <br className="hidden sm:block" />
              <span>Public Distribution.</span> <br />
              <span className="relative inline-block mt-1">
                <span className="text-muted-foreground text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal">
                  A trusted public infrastructure for{" "}
                </span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={dynamicKeywords[keywordIndex]}
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -15, opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="inline-block text-accent font-bold"
                  >
                    {dynamicKeywords[keywordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>

            {/* Supporting Description */}
            <p className="max-w-xl mx-auto text-sm leading-7 text-muted-foreground sm:text-base lg:mx-0">
              PDSW combines privacy-preserving identity, blockchain
              verification, IPFS integrity and intelligent security monitoring
              for a more trustworthy public distribution ecosystem.
            </p>

            {/* Primary CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary hover:text-white"
              >
                <Lock className="size-3.5" />
                <span>Access Platform</span>
                <ArrowRight className="size-3.5 stroke-[2.5]" />
              </Link>

              <Link
                href="/how-it-works"
                className="flex items-center gap-2 rounded-full border border-border bg-card/40 px-6 py-3 text-xs font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary"
              >
                <Activity className="size-3.5 text-primary" />
                <span>Explore How It Works</span>
              </Link>
            </div>

            {/* Quick Stat Tags */}
            <div className="flex flex-wrap items-center justify-center gap-6 border-t border-border pt-5 text-xs font-mono text-muted-foreground lg:justify-start">
              <div>
                <span className="text-foreground font-bold block text-sm">
                  1.45M+
                </span>
                <span>Protected Cards</span>
              </div>
              <div className="h-6 w-px bg-border" />
              <div>
                <span className="text-primary font-bold block text-sm">
                  100% Verified
                </span>
                <span>IPFS Immutable DAG</span>
              </div>
              <div className="h-6 w-px bg-border" />
              <div>
                <span className="text-foreground font-bold block text-sm">
                  Zero-Knowledge
                </span>
                <span>UID Obfuscation</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visualization */}
          <div className="reveal-up lg:col-span-5 flex justify-center [animation-delay:180ms]">
            <HeroVisualization />
          </div>
        </div>
      </div>
    </section>
  );
};
