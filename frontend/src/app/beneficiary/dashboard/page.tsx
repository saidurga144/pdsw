'use client';

import React, { useEffect } from 'react';
import { Beneficiary } from '@/types';
import { useAuthStore } from '@/stores/auth.store';
import { useBeneficiaryStore } from '@/stores/beneficiary.store';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { IntegrityBadge } from '@/components/integrity/IntegrityBadge';
import { RiskIndicator } from '@/components/dashboard/RiskIndicator';
import { Users, FileCheck, History, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function BeneficiaryDashboard() {
  const { user } = useAuthStore();
  const { profile: beneficiary, isLoading: loading, ensureLoaded } = useBeneficiaryStore();

  // Ensures profile is loaded — no-op if already cached and fresh
  useEffect(() => {
    ensureLoaded(user);
  }, [user?.id]);

  if (loading && !beneficiary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
        <Loader2 className="size-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-mono">Loading citizen command dashboard...</p>
      </div>
    );
  }

  const ben = beneficiary || {
    id: user?.id || 'BEN-USER',
    rationCardId: `RC-${user?.id?.slice(-6).toUpperCase() || 'DEL-101'}`,
    fullName: user?.name || 'Authenticated Citizen',
    phone: user?.phone || '+91 98000 00000',
    address: {
      doorNo: 'H-42',
      street: 'Block B, Sector 4',
      district: user?.jurisdiction?.split(',')[0]?.trim() || 'South Delhi',
      state: user?.jurisdiction?.split(',')[1]?.trim() || 'Delhi',
      pincode: '110016',
      pdsCenterId: 'FPS-DEL-102',
      pdsCenterName: `Fair Price Shop #102, ${user?.jurisdiction || 'South Delhi'}`,
    },
    rationCategory: 'PHH' as const,
    familyCount: 1,
    familyMembers: [],
    verificationStatus: 'VERIFIED' as const,
    riskScore: 5,
    riskLevel: 'LOW' as const,
    currentHash: '0x000',
    latestIPFSCid: 'Qm000',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    eligibility: {
      beneficiaryId: user?.id || 'BEN-USER',
      category: 'PHH' as const,
      monthlyEntitlements: [
        { commodity: 'Rice (Fortified)', quantity: 20, unit: 'KG', subsidizedPricePerUnit: 3.0 },
        { commodity: 'Wheat (Whole Grain)', quantity: 15, unit: 'KG', subsidizedPricePerUnit: 2.0 },
        { commodity: 'Refined Sugar', quantity: 2, unit: 'KG', subsidizedPricePerUnit: 13.5 },
      ],
      monthlyIncome: 10000,
      isBPL: true,
      lastReviewedAt: new Date().toISOString(),
      nextReviewDue: new Date().toISOString(),
      status: 'ELIGIBLE' as const,
    },
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-md p-5 md:p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-secondary text-primary font-mono text-[11px] px-2.5 py-0.5 rounded border border-border font-bold">
              ID: {ben.id}
            </span>
            <IntegrityBadge status={ben.verificationStatus === 'VERIFIED' ? 'VERIFIED' : 'VERIFICATION_PENDING'} size="sm" />
          </div>
          <h1 className="ben-title text-foreground">{ben.fullName}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Card No: <span className="font-mono text-foreground font-semibold">{ben.rationCardId}</span> • {ben.address.pdsCenterName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/beneficiary/requests"
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle"
          >
            Submit Change Request
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Ration Category"
          value={ben.rationCategory}
          description="Priority Household Scheme"
          icon={FileCheck}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Family Members"
          value={`${ben.familyCount} Members`}
          description="Verified Aadhaar Entitlements"
          icon={Users}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Eligibility Status"
          value={ben.eligibility.status}
          description="Quota Active for Current Cycle"
          icon={ShieldCheck}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Risk Assessment"
          value={`${ben.riskScore}/100`}
          description={`AI Evaluation: ${ben.riskLevel}`}
          icon={History}
          iconBgColor="bg-secondary text-primary border border-border"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-md p-5 space-y-4 shadow-subtle">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="ben-section-title text-foreground">Monthly Subsidized Welfare Quota</h2>
              <p className="text-xs text-muted-foreground">Current monthly allocation available at your assigned FPS</p>
            </div>
            <Link
              href="/beneficiary/eligibility"
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
            >
              Full Quota Details <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {ben.eligibility.monthlyEntitlements.map((item) => (
              <div
                key={item.commodity}
                className="flex items-center justify-between p-3.5 rounded-md bg-muted/40 border border-border hover:border-primary/40 transition-colors"
              >
                <div>
                  <h3 className="font-bold text-xs text-foreground">{item.commodity}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Subsidized Rate: <span className="font-mono text-primary font-bold">₹{item.subsidizedPricePerUnit}</span> per {item.unit}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-foreground font-mono">
                    {item.quantity} {item.unit}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-mono block">Monthly Limit</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-md p-5 space-y-4 shadow-subtle flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="ben-section-title text-foreground border-b border-border pb-3">
              Citizen Self-Service Actions
            </h2>
            <div className="space-y-2">
              <Link
                href="/beneficiary/profile"
                className="w-full p-3 rounded-md bg-secondary/50 hover:bg-secondary border border-border flex items-center justify-between text-xs font-semibold text-foreground transition-all group"
              >
                <span>View Full Profile & Address</span>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link
                href="/beneficiary/family"
                className="w-full p-3 rounded-md bg-secondary/50 hover:bg-secondary border border-border flex items-center justify-between text-xs font-semibold text-foreground transition-all group"
              >
                <span>Manage Family Members</span>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link
                href="/beneficiary/requests"
                className="w-full p-3 rounded-md bg-secondary/50 hover:bg-secondary border border-border flex items-center justify-between text-xs font-semibold text-foreground transition-all group"
              >
                <span>Submit Address / Detail Change</span>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <Link
                href="/beneficiary/transactions"
                className="w-full p-3 rounded-md bg-secondary/50 hover:bg-secondary border border-border flex items-center justify-between text-xs font-semibold text-foreground transition-all group"
              >
                <span>Distribution Receipts & History</span>
                <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <RiskIndicator score={ben.riskScore} level={ben.riskLevel} />
          </div>
        </div>
      </div>
    </div>
  );
}
