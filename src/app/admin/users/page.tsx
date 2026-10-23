'use client';

import React from 'react';
import { MOCK_USERS } from '@/mock-data/pds-data';
import { Users, UserCheck, Search, Plus, Shield } from 'lucide-react';

export default function UserDirectoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">User Directory & Staff Provisioning</h1>
          <p className="text-xs text-slate-400">Manage admin, auditor, inspector officer, and beneficiary user accounts</p>
        </div>

        <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow">
          + Provision User Account
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Assigned District</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {MOCK_USERS.map((u) => (
              <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-cyan-400 font-bold">{u.id}</td>
                <td className="px-4 py-3 font-semibold text-slate-200">{u.name}</td>
                <td className="px-4 py-3 font-mono font-bold text-indigo-300">{u.role}</td>
                <td className="px-4 py-3 text-slate-400">{u.email}</td>
                <td className="px-4 py-3 text-slate-300">{u.assignedDistrict || 'National'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 font-bold text-[10px] rounded border border-emerald-800">
                    {u.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
