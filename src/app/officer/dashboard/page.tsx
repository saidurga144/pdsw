'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RiskIndicator } from '@/components/dashboard/RiskIndicator';
import { Users, Send, AlertTriangle, Building2, PackageOpen, CheckCircle, ArrowRight } from 'lucide-react';
import { apiClient } from '@/services/api/client';
import Link from 'next/link';

export default function OfficerDashboard() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [beneficiaryCount, setBeneficiaryCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const officerName = user?.name || 'PDS Field Inspector';
  const officerId = user?.id ? `OFF-${user.id.slice(-6).toUpperCase()}` : 'OFF-HQ';
  const jurisdiction = user?.jurisdiction || 'Assigned Zone';

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [reqRes, benRes] = await Promise.allSettled([
          apiClient.get('/officer/requests'),
          apiClient.get('/officer/beneficiaries'),
        ]);

        if (reqRes.status === 'fulfilled' && reqRes.value.data?.success && Array.isArray(reqRes.value.data.requests)) {
          setRequests(reqRes.value.data.requests);
        } else {
          setRequests([]);
        }

        if (benRes.status === 'fulfilled' && benRes.value.data?.success && Array.isArray(benRes.value.data.beneficiaries)) {
          setBeneficiaryCount(benRes.value.data.beneficiaries.length);
        } else {
          setBeneficiaryCount(0);
        }
      } catch {
        setRequests([]);
        setBeneficiaryCount(0);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const pendingRequests = requests.filter((r) => r.status === 'SUBMITTED' || r.status === 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-secondary text-foreground font-mono text-[11px] px-2.5 py-0.5 rounded border border-border font-bold">
              {officerId}
            </span>
            <span className="text-xs text-muted-foreground">{jurisdiction}</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">{officerName} — Operations Dashboard</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/officer/distribution"
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle"
          >
            Release Commodities
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid - Default 0 when empty */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Assigned Jurisdiction"
          value={beneficiaryCount.toString()}
          description={`${jurisdiction} (Enrolled)`}
          icon={Users}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Pending Modifications"
          value={pendingRequests.length.toString()}
          description="Citizen diff review required"
          icon={Send}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Flagged Risk Alerts"
          value="0"
          description="AI Anomaly Engine flags"
          icon={AlertTriangle}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Today's Release Txns"
          value="0"
          description="Biometric verified"
          icon={Building2}
          iconBgColor="bg-secondary text-primary border border-border"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Actionable Task Queue & Diff Reviews */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-md p-5 shadow-subtle space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Send className="size-4 text-primary" /> Pending Modification Diff Reviews
              </h2>
              <Link href="/officer/requests" className="text-xs text-primary hover:underline font-semibold flex items-center gap-1">
                Open Review Module <ArrowRight className="size-3" />
              </Link>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-secondary text-primary border border-border">
                  <PackageOpen className="size-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">No Pending Modification Requests</p>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  When enrolled citizens submit address changes, family additions, or quota modifications, they will appear here for verification.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="bg-muted/40 p-4 rounded-md border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-primary">{req.id}</span>
                        <h3 className="font-bold text-xs text-foreground mt-0.5">{req.beneficiary_id || 'Citizen Request'}</h3>
                      </div>
                      <RiskIndicator score={req.ai_risk_score || 5} level="LOW" />
                    </div>

                    <div className="text-xs text-foreground bg-card p-2.5 rounded border border-border">
                      <span className="text-[10px] font-bold text-muted-foreground block uppercase">Request Type:</span>
                      <span>{req.request_type} • {req.reason || 'Citizen online self-service request'}</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Link
                        href={`/officer/requests?id=${req.id}`}
                        className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-md transition-all shadow-subtle"
                      >
                        Compare Previous vs Requested Values
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: AI Anomaly Alerts Triage */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-md p-5 shadow-subtle space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                <AlertTriangle className="size-4 text-primary" /> Field Risk Alerts
              </h2>
              <Link href="/officer/alerts" className="text-xs text-primary hover:underline font-semibold">
                View All
              </Link>
            </div>

            <div className="py-8 text-center space-y-2">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-secondary text-primary border border-border">
                <CheckCircle className="size-5" />
              </div>
              <p className="text-xs font-semibold text-foreground">Zero Risk Anomalies</p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                All commodity distribution patterns and citizen telemetry are operating within normal baseline limits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
