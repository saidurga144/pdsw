'use client';

import React, { useState } from 'react';
import { MOCK_AUDIT_TRAIL } from '@/mock-data/pds-data';
import { IntegrityBadge } from '@/components/integrity/IntegrityBadge';
import { Eye, Search, Filter, Download } from 'lucide-react';

export default function AuditTrailExplorerPage() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_AUDIT_TRAIL.filter(
    (a) => a.actor.toLowerCase().includes(search.toLowerCase()) || a.recordId.toLowerCase().includes(search.toLowerCase()) || a.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Immutable Audit Trail Explorer</h1>
          <p className="text-xs text-slate-400">Forensic search across all administrative actions, state transitions, and IPFS DAG commits</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Actor, Action, Record ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Actor & Role</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Record ID</th>
              <th className="px-4 py-3">Integrity Status</th>
              <th className="px-4 py-3 text-right">IPFS CID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 text-slate-400">{new Date(item.timestamp).toLocaleString()}</td>
                <td className="px-4 py-3 font-sans">
                  <span className="font-semibold text-slate-200 block">{item.actor}</span>
                  <span className="text-[10px] text-cyan-400">{item.role}</span>
                </td>
                <td className="px-4 py-3 text-emerald-400 font-semibold">{item.action}</td>
                <td className="px-4 py-3 text-slate-300 font-sans">{item.entity}</td>
                <td className="px-4 py-3 font-bold text-cyan-300">{item.recordId}</td>
                <td className="px-4 py-3 font-sans">
                  <IntegrityBadge status={item.integrityStatus as any} size="sm" />
                </td>
                <td className="px-4 py-3 text-right text-slate-400">{item.ipfsCid.substring(0, 14)}...</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
