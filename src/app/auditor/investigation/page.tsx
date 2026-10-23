'use client';

import React, { useState } from 'react';
import { VersionTimeline } from '@/components/integrity/VersionTimeline';
import { HashComparison } from '@/components/integrity/HashComparison';
import { RecordVersion } from '@/types';
import { Search, ShieldAlert, PackageOpen } from 'lucide-react';

export default function RecordInvestigationPage() {
  const [searchId, setSearchId] = useState('');

  const evidenceHistory: RecordVersion[] = [
    {
      version: 1,
      operation: 'CREATE',
      previousHash: '0x0000000000000000000000000000000000000000',
      currentHash: '0x3a91b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0',
      ipfsCid: 'QmYwAPJzv5CZsnA625s3X2nemtYgPpHdWEz79ojWnPbdG1',
      actorId: 'usr-off-002',
      actorRole: 'OFFICER',
      timestamp: '2026-01-15T10:00:00Z',
      changeSummary: 'Initial beneficiary profile creation under PHH scheme',
    },
    {
      version: 2,
      operation: 'PROFILE_MODIFY',
      previousHash: '0x3a91b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0',
      currentHash: '0x5b12c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
      ipfsCid: 'QmPZ9gcCEoQSKSYsVPGpBmyBCa21zpFiEpQXjhMa2w934G',
      actorId: 'usr-ben-001',
      actorRole: 'BENEFICIARY',
      timestamp: '2026-04-20T14:30:00Z',
      changeSummary: 'Address update validated by field inspector',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Record Evidence Forensic Investigation Probe</h1>
          <p className="text-xs text-muted-foreground">Reconstruct complete state history from genesis block to current hash anchor</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="size-4 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Target Record ID..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {!searchId.trim() ? (
        <div className="bg-card border border-border rounded-md p-12 text-center space-y-3 shadow-subtle">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-primary border border-border">
            <PackageOpen className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Forensic Probe Ready</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Enter a Beneficiary ID or Ration Card Number above to reconstruct cryptographic state history and IPFS anchor proofs.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-md p-5 space-y-4 shadow-subtle">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div className="min-w-0">
                <span className="font-mono text-xs font-bold text-primary">{searchId}</span>
                <h2 className="text-base font-bold text-foreground mt-0.5">Target Inspection Record</h2>
              </div>
              <span className="px-3 py-1 bg-secondary text-primary font-mono text-xs font-bold rounded-full border border-border shrink-0 self-start sm:self-auto">
                RECORD STATUS: VERIFIED
              </span>
            </div>

            <HashComparison
              expectedHash="0x5b12c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"
              currentDatabaseHash="0x5b12c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"
              ipfsCid="QmPZ9gcCEoQSKSYsVPGpBmyBCa21zpFiEpQXjhMa2w934G"
              status="VERIFIED"
              lastVerifiedAt={new Date().toISOString()}
            />
          </div>

          <div className="bg-card border border-border rounded-md p-6 shadow-subtle space-y-4">
            <h2 className="font-bold text-sm text-foreground border-b border-border pb-3">
              Chronological Evidence Chain Timeline
            </h2>
            <VersionTimeline versions={evidenceHistory} />
          </div>
        </>
      )}
    </div>
  );
}
