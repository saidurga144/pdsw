"use client";

import React from "react";
import { MOCK_SECURITY_EVENTS } from "@/mock-data/pds-data";
import { ShieldAlert, Search } from "lucide-react";

export default function SecurityEventsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100">
          Security Event Explorer
        </h1>
        <p className="text-xs text-slate-400">
          Authentication failures, API rate limits, and unauthorized access logs
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm responsive-table-wrap">
        <table className="responsive-table text-left text-xs font-mono">
          <thead className="bg-slate-950 text-slate-400 font-sans uppercase text-[10px] border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Event ID</th>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">IP Address</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3 text-right">Severity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {MOCK_SECURITY_EVENTS.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-slate-400 font-sans"
                >
                  <div className="max-w-sm mx-auto flex flex-col items-center justify-center space-y-2">
                    <ShieldAlert className="w-8 h-8 text-slate-600" />
                    <p className="font-semibold text-slate-300">
                      No Security Events Logged
                    </p>
                    <p className="text-xs text-slate-500">
                      All systems nominal. No unauthorized access attempts or
                      suspicious events recorded.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              MOCK_SECURITY_EVENTS.map((evt) => (
                <tr
                  key={evt.id}
                  className="hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-cyan-400 font-bold">
                    {evt.id}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(evt.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-sans text-slate-300">
                    {evt.category}
                  </td>
                  <td className="px-4 py-3 font-sans text-slate-200">
                    {evt.actor}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{evt.ipAddress}</td>
                  <td className="px-4 py-3 font-sans text-rose-400 font-semibold">
                    {evt.action}
                  </td>
                  <td className="px-4 py-3 text-right font-sans">
                    <span className="px-2 py-0.5 bg-rose-950 text-rose-300 font-bold text-[10px] rounded border border-rose-800">
                      {evt.severity}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
