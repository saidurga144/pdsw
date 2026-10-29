"use client";

import React from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";

export const HeroSection: React.FC = () => (
  <section id="platform" className="relative isolate flex min-h-[720px] h-[92svh] max-h-[980px] w-full items-end overflow-hidden bg-[#111D28] scroll-mt-0 sm:min-h-[760px]">
    <img
      src="/images/hero.png"
      alt="A public distribution shop worker handing food grains to a beneficiary"
      className="absolute inset-0 -z-20 size-full object-cover object-center"
      fetchPriority="high"
    />
    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#111D28]/90 via-[#111D28]/65 to-[#111D28]/15" />
    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#111D28]/75 via-transparent to-[#111D28]/20" />

    <div className="mx-auto w-full max-w-[1440px] px-5 pb-14 pt-32 sm:px-8 sm:pb-16 lg:px-10 lg:pb-20">
      <div className="max-w-4xl">
        <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-200 sm:text-xs">
          Public Distribution · Digital Services
        </p>
        <h1 className="editorial-heading max-w-4xl text-white hero-heading-size">
          Building trust in every grain distributed.
        </h1>
        <p className="mt-6 max-w-2xl text-[15px] leading-7 text-white/85 sm:text-base sm:leading-8">
          PDS Welfare brings beneficiary services, distribution workflows, and verifiable records together in one role-based platform.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/login" className="inline-flex min-h-12 items-center justify-center gap-3 bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary">
            Enter the platform <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <a href="#about" className="inline-flex min-h-12 items-center justify-center gap-3 border border-white/50 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            Explore the platform <ArrowDown className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="mt-14 grid max-w-3xl grid-cols-1 border-t border-white/30 pt-5 text-sm text-white/85 sm:grid-cols-3 sm:gap-5">
        <p className="border-b border-white/20 py-3 sm:border-b-0 sm:py-0">Role-based access</p>
        <p className="border-b border-white/20 py-3 sm:border-b-0 sm:py-0">Distribution workflows</p>
        <p className="py-3 sm:py-0">Integrity review tools</p>
      </div>
    </div>
  </section>
);
