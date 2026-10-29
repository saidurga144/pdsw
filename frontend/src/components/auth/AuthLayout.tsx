"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => (
  <div className="auth-page min-h-svh w-full px-4 py-6 sm:px-8 lg:grid lg:grid-cols-2 lg:p-0">
    <section className="auth-showcase relative hidden min-h-svh overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <img src="/images/hero.png" alt="Public distribution shop" className="absolute inset-0 size-full object-cover opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#111D28] via-[#111D28]/95 to-[#111D28]/70" />
      <div className="relative z-10 flex items-center gap-3">
        <span className="flex size-12 items-center justify-center overflow-hidden rounded-md bg-white">
          <img src="/logo.png" alt="PDSW logo" className="size-11 object-contain" />
        </span>
        <span>
          <span className="block text-sm font-semibold tracking-wide">PDS Welfare Platform</span>
          <span className="mt-0.5 block text-xs text-white/75">Public distribution services</span>
        </span>
      </div>
      <div className="relative z-10 max-w-xl py-16">
        <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-300">Secure role-based access</p>
        <h1 className="editorial-heading text-5xl leading-[1.05] text-white xl:text-6xl">Services and records, in one place.</h1>
        <p className="mt-6 max-w-lg text-base leading-7 text-white/75">Sign in to access the beneficiary, officer, or administration tools assigned to your account.</p>
      </div>
      <p className="relative z-10 text-xs text-white/60">PDS Welfare Platform</p>
    </section>

    <section className="relative flex min-h-[calc(100svh-3rem)] items-center justify-center lg:min-h-svh lg:px-10 lg:py-14">
      <Link href="/" className="absolute left-0 top-0 inline-flex size-10 items-center justify-center border border-border bg-white text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:left-8 lg:top-8" aria-label="Back to home">
        <ArrowLeft className="size-4" />
      </Link>
      <div className="mx-auto w-full max-w-md space-y-6 border border-border bg-white p-5 sm:p-8">
        <div>
          <h2 className="editorial-heading text-3xl text-foreground sm:text-4xl">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </section>
  </div>
);
