'use client';

import React, { useState } from 'react';
import { MOCK_SECURITY_INCIDENTS } from '@/mock-data/pds-data';
import { RiskIndicator } from '@/components/dashboard/RiskIndicator';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Cpu, ShieldCheck, ShieldAlert, AlertTriangle, Lock, CheckCircle2, UserX } from 'lucide-react';

export default function CyberAIAnalyticsPage() {
  const incident = MOCK_SECURITY_INCIDENTS[0];
  const [showConfirmRestrict, setShowConfirmRestrict] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);

  const handleRestrictAccess = () => {
    setIsRestricted(true);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          Cyber AI Anomaly Behavioral Intelligence
        </h1>
        <p className="text-xs text-slate-400">Explainable AI detection of officer account compromise and insider threat vectors</p>
      </div>

      {!incident ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="p-3 bg-slate-800 rounded-full w-12 h-12 flex items-center justify-center mx-auto border border-slate-700">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="empty-state-title text-slate-200">No Cyber Incidents Detected</h2>
            <p className="empty-state-description text-slate-400 mt-1">
              No account compromises, brute-force anomalies, or unauthorized off-hours access patterns detected.
              Neural behavioral analytics engine is active and analyzing all session signatures.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-rose-400">{incident.id}</span>
                <span className="px-2.5 py-0.5 bg-rose-950 text-rose-300 font-mono text-[10px] font-bold rounded border border-rose-800">
                  CRITICAL THREAT
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-100 mt-1">{incident.title}</h2>
              <p className="text-xs text-slate-400">Target Entity: <span className="font-semibold text-slate-200">{incident.affectedEntity}</span></p>
            </div>

            <RiskIndicator score={92} level="HIGH" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Baseline Normal Login Pattern</span>
              <p className="text-slate-200 font-mono font-semibold">Active Hours: 09:00 - 18:00 IST</p>
              <p className="text-slate-400">Average Requests: 4 reviews / day</p>
              <p className="text-slate-400">IP Subnet: 192.168.10.0/24</p>
            </div>

            <div className="bg-rose-950/40 p-4 rounded-xl border border-rose-800 space-y-2">
              <span className="text-[10px] font-bold text-rose-400 uppercase block">Current Anomalous Behavior</span>
              <p className="text-rose-300 font-mono font-bold">Unusual Login: 02:43 AM IST</p>
              <p className="text-rose-300 font-bold">17 Failed Requests • 82 Sensitive Records Access</p>
              <p className="text-rose-400 font-mono">Unauthorized IP Subnet: 103.22.11.45</p>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Cpu className="w-4 h-4" /> Explainable Risk Factors
            </span>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {incident.aiExplainability?.factors?.map((f: string, idx: number) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>Automated response requires Tier-3 SOC analyst authorization</span>
            </div>

            {isRestricted ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-lg text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" /> Credentials Suspended & Session Revoked
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmRestrict(true)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-lg flex items-center gap-2"
              >
                <UserX className="w-4 h-4" /> Restrict Officer Access Immediately
              </button>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showConfirmRestrict}
        title="Immediate Account Restriction"
        description="Are you sure you want to revoke all active sessions and suspend credentials for this account? This action triggers a cryptographically sealed emergency audit event."
        confirmText="Revoke & Restrict"
        isDestructive={true}
        onConfirm={handleRestrictAccess}
        onClose={() => setShowConfirmRestrict(false)}
      />
    </div>
  );
}
