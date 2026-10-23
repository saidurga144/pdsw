'use client';

import React from 'react';
import { Users, Truck, ShieldCheck } from 'lucide-react';

const SERVICES = [
  {
    icon: Users,
    title: 'Beneficiary Management',
    description:
      'Manage beneficiary details, family members, entitlements, and account information securely.',
  },
  {
    icon: Truck,
    title: 'PDS Distribution',
    description:
      'Manage commodity distribution, verify beneficiaries, and maintain accurate distribution records and receipts.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure & Transparent System',
    description:
      'Protect user data with secure authentication, blockchain verification, and transparent transaction records.',
  },
];

export const OurServices: React.FC = () => {
  return (
    <section
      id="services"
      className="border-t border-border scroll-mt-20"
      style={{ backgroundColor: '#f5f8f5', paddingTop: 'clamp(3rem, 6vw, 5rem)', paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">

        {/* ── Section heading ── */}
        <div className="text-center mb-12">
          <h2
            className="font-bold text-foreground"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', letterSpacing: '-0.02em' }}
          >
            Our Services
          </h2>
        </div>

        {/* ── Cards grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {SERVICES.map((svc, i) => {
            const Icon = svc.icon;
            const isMiddle = i === 1;

            return (
              <div
                key={svc.title}
                className={`
                  group flex flex-col items-center text-center rounded-2xl bg-white px-8 py-10 transition-all duration-200
                  ${isMiddle
                    ? 'shadow-lg ring-1 ring-border scale-[1.02]'
                    : 'shadow-sm border border-border hover:shadow-md hover:-translate-y-0.5'
                  }
                `}
              >
                {/* Icon circle */}
                <div
                  className="flex items-center justify-center rounded-full mb-7 transition-colors duration-200 group-hover:bg-primary/15"
                  style={{
                    width: 72,
                    height: 72,
                    backgroundColor: isMiddle ? 'rgba(239,51,64,0.12)' : 'rgba(239,51,64,0.08)',
                  }}
                >
                  <Icon
                    className="text-primary"
                    style={{ width: 30, height: 30 }}
                    strokeWidth={1.8}
                  />
                </div>

                {/* Title */}
                <h3
                  className="font-bold text-foreground mb-3"
                  style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', letterSpacing: '-0.01em' }}
                >
                  {svc.title}
                </h3>

                {/* Description */}
                <p
                  className="text-muted-foreground leading-relaxed"
                  style={{ fontSize: 'clamp(0.82rem, 1vw, 0.92rem)', lineHeight: 1.7 }}
                >
                  {svc.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
