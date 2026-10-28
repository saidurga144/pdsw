"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  FileText,
  CheckCircle2,
} from "lucide-react";

export default function ReportsAnalyticsPage() {
  const [exportedFormat, setExportedFormat] = useState<string | null>(null);

  const handleExport = (format: string, reportName: string) => {
    setExportedFormat(`${reportName} (${format})`);
    setTimeout(() => setExportedFormat(null), 3000);
  };

  const reports = [
    {
      title: "Operational Beneficiary Growth",
      category: "Operational",
      desc: "Total active vs inactive ratio and entitlement statistics.",
    },
    {
      title: "AI Anomaly & Risk Breakdown",
      category: "AI Intelligence",
      desc: "Anomaly detection trends and high-risk entity distribution.",
    },
    {
      title: "Cyber Security Incident Log",
      category: "SOC Security",
      desc: "Failed login attempts, RBAC violations, and rate limit spikes.",
    },
    {
      title: "Cryptographic Integrity & IPFS Audit",
      category: "Integrity",
      desc: "Verified records, hash mismatch alerts, and IPFS CIDs.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100">
          Reports & Export Analytics
        </h1>
        <p className="text-xs text-slate-400">
          Generate compliance audit exports in PDF, CSV, and Excel formats
        </p>
      </div>

      {exportedFormat && (
        <div className="p-3 bg-emerald-950 border border-emerald-800 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Export generated successfully: {exportedFormat}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <div
            key={r.title}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3"
          >
            <span className="text-[10px] font-mono font-bold bg-slate-950 px-2 py-0.5 rounded text-cyan-400 border border-slate-800">
              {r.category}
            </span>
            <h3 className="font-bold text-sm text-slate-100">{r.title}</h3>
            <p className="text-xs text-slate-400">{r.desc}</p>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => handleExport("PDF", r.title)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg flex items-center gap-1"
              >
                <Download className="w-3 h-3 text-cyan-400" /> Export PDF
              </button>
              <button
                onClick={() => handleExport("CSV", r.title)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg flex items-center gap-1"
              >
                <Download className="w-3 h-3 text-emerald-400" /> Export CSV
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
