'use client';

import React from 'react';
import { MOCK_INTEGRITY_VERIFICATIONS, MOCK_VERSION_HISTORY } from '@/mock-data/pds-data';
import { HashComparison } from '@/components/integrity/HashComparison';
import { VersionTimeline } from '@/components/integrity/VersionTimeline';
import { IntegrityBadge } from '@/components/integrity/IntegrityBadge';
import { ShieldCheck, RefreshCw, FileText } from 'lucide-react';

export default function AdminIntegrityPage() {
  const verifications = MOCK_INTEGRITY_VERIFICATIONS;
  const mismatchCount = verifications.filter((v) => v.status === 'MISMATCH_DETECTED').length;
  const verifiedCount = verifications.filter((v) => v.status === 'VERIFIED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            Cryptographic Integrity & Hash Verification
          </h1>
          <p className="text-xs text-slate-400">Automated SHA-256 database state validation against IPFS immutable proof anchors</p>
        </div>

        <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 shadow">
          <RefreshCw className="w-4 h-4" /> Run Full Audit Sweep
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase">Verified Records</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">{verifiedCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Cryptographically Valid</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase">Integrity Mismatches</p>
          <p className="text-2xl font-extrabold text-rose-500 mt-1 font-mono">{mismatchCount}</p>
          <p className="text-[11px] text-rose-400 mt-1">Immediate SOC Alert Triggered</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase">IPFS Provenance Ledger</p>
          <p className="text-2xl font-extrabold text-cyan-400 mt-1 font-mono">{verifications.length} CIDs</p>
          <p className="text-[11px] text-slate-500 mt-1">Content-Addressed DAG</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2">Active Hash Verification Sweeps</h2>
        {verifications.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-400 space-y-2">
            <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No Verification Sweeps Recorded</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              No database records currently require integrity reconciliation in clean slate.
            </p>
          </div>
        ) : (
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
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-3">
          Beneficiary Record Version History
        </h2>
        {MOCK_VERSION_HISTORY.length === 0 ? (
          <div className="py-8 text-center text-slate-500 space-y-2">
            <FileText className="w-6 h-6 mx-auto opacity-40" />
            <p className="text-xs">No version history records found.</p>
          </div>
        ) : (
          <VersionTimeline versions={MOCK_VERSION_HISTORY} />
        )}
      </div>
    </div>
  );
}
