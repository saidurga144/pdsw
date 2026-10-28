"use client";

import React from "react";
import { HeroSection } from "@/components/landing/HeroSection";
import { OurServices } from "@/components/landing/OurServices";

export default function LandingHomePage() {
  return (
    <div className="w-full bg-background">
      {/* ── Hero ── */}
      <HeroSection />

      {/* ── About Us ── */}
      <section
        id="about"
        className="border-t border-border bg-background scroll-mt-20"
        style={{
          paddingTop: "clamp(3rem, 6vw, 5rem)",
          paddingBottom: "clamp(3rem, 6vw, 5rem)",
        }}
      >
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-3xl text-center space-y-5">
            <h2
              className="font-bold text-foreground"
              style={{
                fontSize: "clamp(1.6rem, 3vw, 2.25rem)",
                letterSpacing: "-0.02em",
              }}
            >
              About Us
            </h2>

            <p
              className="text-muted-foreground"
              style={{
                fontSize: "clamp(0.9rem, 1.2vw, 1.05rem)",
                lineHeight: 1.8,
              }}
            >
              At PDS Welfare, we use technology to make the Public Distribution
              System more secure, transparent, and efficient. Our platform
              connects beneficiaries, PDS officers, and administrators in one
              system, helping manage beneficiary information, family details,
              entitlements, and distribution records. With secure authentication
              and blockchain-based verification, we aim to make food
              distribution easier to manage, trustworthy, and accessible for
              everyone.
            </p>
          </div>
        </div>
      </section>

      {/* ── Our Services ── */}
      <OurServices />
    </div>
  );
}
