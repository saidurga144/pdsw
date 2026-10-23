'use client';

import React from 'react';
import { MOCK_ROLE_PERMISSIONS } from '@/mock-data/pds-data';
import { Lock, Check, X, Shield } from 'lucide-react';

export default function RolePermissionManagementPage() {
  const roles = ['BENEFICIARY', 'OFFICER', 'ADMIN', 'SOC'] as const;
  const modules = ['BENEFICIARY', 'FAMILY', 'ELIGIBILITY', 'DISTRIBUTION', 'USERS', 'ROLES', 'AI_RISK', 'INTEGRITY', 'SECURITY', 'AUDIT', 'SETTINGS'];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100">Role-Based Access Control (RBAC) Matrix</h1>
        <p className="text-xs text-slate-400">Configure portal capabilities across government personas</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm responsive-table-wrap">
        <table className="responsive-table text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Module Feature</th>
              {roles.map((r) => (
                <th key={r} className="px-4 py-3 text-center">{r}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {modules.map((mod) => (
              <tr key={mod} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-200">{mod}</td>
                {roles.map((r) => {
                  const rolePerm = MOCK_ROLE_PERMISSIONS.find((p) => p.role === r);
                  const perm = rolePerm?.permissions.find((p) => p.module === mod);
                  const allowed = perm?.canView || false;

                  return (
                    <td key={r} className="px-4 py-3 text-center">
                      {allowed ? (
                        <span className="inline-flex p-1 bg-emerald-950 text-emerald-400 rounded-full border border-emerald-800">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="inline-flex p-1 bg-slate-950 text-slate-600 rounded-full border border-slate-800">
                          <X className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
