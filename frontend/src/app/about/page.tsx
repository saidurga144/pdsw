"use client";

import React from "react";

export default function AboutPage() {
  return (
    <div className="bg-background min-h-screen">
      <div
        className="mx-auto max-w-3xl px-5 sm:px-8 text-center"
        style={{
          paddingTop: "clamp(3.5rem, 8vw, 6rem)",
          paddingBottom: "clamp(3.5rem, 8vw, 6rem)",
        }}
      >
        <div className="space-y-6">
          <h1
            className="font-bold text-foreground"
            style={{
              fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)",
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
            }}
          >
            About Us
          </h1>

          <p
            className="text-muted-foreground mx-auto"
            style={{
              fontSize: "clamp(0.95rem, 1.3vw, 1.1rem)",
              lineHeight: 1.85,
              maxWidth: "680px",
            }}
          >
            At PDS Welfare, we use technology to make the Public Distribution
            System more secure, transparent, and efficient. Our platform
            connects beneficiaries, PDS officers, and administrators in one
            system, helping manage beneficiary information, family details,
            entitlements, and distribution records. With secure authentication
            and blockchain-based verification, we aim to make food distribution
            easier to manage, trustworthy, and accessible for everyone.
          </p>
        </div>
      </div>
    </div>
  );
}
