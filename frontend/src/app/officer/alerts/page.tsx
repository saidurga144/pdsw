"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";

export default function OfficerAlertsPage() {
  return (
    <div className="space-y-7">
      <header className="border-b border-border pb-5">
        <p className="eyebrow mb-1">Officer workspace</p>
        <h1 className="editorial-heading text-3xl text-foreground sm:text-4xl">Field risk alerts</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Review risk alerts made available to the officer portal.</p>
      </header>
      <section className="flex min-h-[320px] flex-col items-center justify-center border border-border bg-white px-6 py-12 text-center">
        <div className="mb-5 flex size-12 items-center justify-center rounded-full border border-border bg-background"><ShieldAlert className="size-5 text-primary" /></div>
        <h2 className="text-lg font-semibold text-foreground">No officer alert feed is connected</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">The current application does not provide an officer-authorized risk alert endpoint. This view will show alerts when that feed is available.</p>
        <Link href="/officer/dashboard" className="mt-6 inline-flex min-h-10 items-center gap-2 border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background">Back to dashboard <ArrowRight className="size-4" /></Link>
      </section>
    </div>
  );
}
