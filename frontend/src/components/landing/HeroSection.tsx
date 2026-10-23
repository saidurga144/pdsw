'use client';

import React from 'react';
import Link from 'next/link';

export const HeroSection: React.FC = () => {
  return (
    <section
      id="platform"
      className="relative w-full border-b border-border scroll-mt-[80px] overflow-hidden"
      style={{ minHeight: 'clamp(340px, 50vw, 520px)' }}
    >
      {/* ── Two-column grid: image left, text right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 h-full" style={{ minHeight: 'inherit' }}>

        {/* ── LEFT — Image panel ── */}
        <div className="relative w-full overflow-hidden" style={{ minHeight: 'clamp(220px, 35vw, 520px)' }}>
          <img
            src="/images/hero.png"
            alt="PDS officer handing food grains to a beneficiary at a ration shop"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Subtle right-edge fade so text panel feels seamless */}
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-black/5 hidden lg:block" />
        </div>

        {/* ── RIGHT — Text panel ── */}
        <div
          className="flex flex-col justify-center px-8 sm:px-12 lg:px-14"
          style={{
            backgroundColor: '#faf7f4',
            paddingTop: 'clamp(2.5rem, 5vw, 4rem)',
            paddingBottom: 'clamp(2.5rem, 5vw, 4rem)',
          }}
        >
          {/* Heading */}
          <h1
            className="font-extrabold leading-tight tracking-tight"
            style={{
              fontSize: 'clamp(1.7rem, 3.2vw, 2.8rem)',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
              color: '#111318',
            }}
          >
            PDS Welfare Platform
          </h1>

          {/* Subheading */}
          <p
            className="mt-2 font-light"
            style={{
              fontSize: 'clamp(1rem, 1.9vw, 1.6rem)',
              letterSpacing: '-0.01em',
              lineHeight: 1.25,
              color: 'hsl(356 82% 50%)',
            }}
          >
            Secure &amp; Transparent Public Distribution
          </p>

          {/* Body */}
          <p
            className="mt-5 font-normal"
            style={{
              fontSize: 'clamp(0.82rem, 0.95vw, 0.95rem)',
              lineHeight: 1.85,
              color: '#4a4a4a',
              maxWidth: '480px',
            }}
          >
            Making the Public Distribution System simple, secure, and transparent.
            PDS Welfare helps administrators, PDS officers, and beneficiaries manage
            accounts, family details, entitlements, commodity distribution, and
            transaction records in one platform. With secure login, blockchain-based
            verification, and proper record management, the platform helps make
            public distribution more reliable and easier to manage.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-8">
            <Link
              href="/about"
              className="inline-flex items-center justify-center rounded-lg border-2 px-6 py-2.5 text-[13px] font-semibold transition-all duration-150 active:scale-[0.98] hover:bg-gray-100"
              style={{ borderColor: '#111318', color: '#111318', backgroundColor: 'transparent' }}
            >
              Learn More
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary/90 active:scale-[0.98]"
            >
              Log In
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
};
