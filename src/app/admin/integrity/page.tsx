'use client';

import React from 'react';
import { MOCK_INTEGRITY_VERIFICATIONS, MOCK_VERSION_HISTORY } from '@/mock-data/pds-data';
import { HashComparison } from '@/components/integrity/HashComparison';
import { VersionTimeline } from '@/components/integrity/VersionTimeline';
import { IntegrityBadge } from '@/components/integrity/IntegrityBadge';
import { ShieldCheck, ShieldAlert, Cpu, Database, RefreshCw } from 'lucide-react';

export default function AdminIntegrityPage() {
  const verifications = MOCK_INTEGRITY_VERIFICATIONS;
  const mismatchCount = verifications.filter((v) => v.status === 'MISMATCH_DETECTED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Cryptographic Integrity & Hash Verification</h1>
          <p className="text-xs text-slate-400">Automated SHA-256 database state validation against IPFS immutable proof anchors</p>
        </div>

        <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 shadow">
          <RefreshCw className="w-4 h-4" /> Run Full Audit Sweep
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase">Verified Records</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">1,450,889</p>
          <p className="text-[11px] text-slate-500 mt-1">100% SHA-256 Valid</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase">Integrity Mismatches</p>
          <p className="text-2xl font-extrabold text-rose-500 mt-1 font-mono">{mismatchCount}</p>
          <p className="text-[11px] text-rose-400 mt-1">Immediate SOC Alert Triggered</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase">IPFS Provenance Ledger</p>
          <p className="text-2xl font-extrabold text-cyan-400 mt-1 font-mono">4,120,991 CIDs</p>
          <p className="text-[11px] text-slate-500 mt-1">Content-Addressed DAG</p>
        </div>
      </div>

      {/* Hash Verification Cards */}
      <div className="space-y-6">
        <h2 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">Active Hash Verification Sweeps</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {verifications.map((v) => (
            <div key={v.recordId} className="space-y-2">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-mono font-bold text-slate-300">Record: {v.recordId}</span>
                <IntegrityBadge status={v.status} size="sm" />
              </div>
              <HashComparison
                expectedHash={v.expectedHash}
                currentDatabaseHash={v.currentDatabaseHash}
                ipfsCid={v.ipfsEvidenceCid}
                status={v.status}
                lastVerifiedAt={v.lastVerifiedAt}
              />
              {v.tamperAlertDetails && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-300 text-xs font-mono">
                  ⚠ ALERT: {v.tamperAlertDetails}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Record Version History Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-3">
          Beneficiary Record Version History (BEN-IND-2026-8841)
        </h2>
        <VersionTimeline versions={MOCK_VERSION_HISTORY} />
      </div>
    </div>
  );
}
