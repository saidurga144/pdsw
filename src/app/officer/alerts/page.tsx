"use client";

import React from "react";
import { MOCK_ANOMALY_ALERTS } from "@/mock-data/pds-data";
import { RiskIndicator } from "@/components/dashboard/RiskIndicator";
import { AlertTriangle, ShieldAlert } from "lucide-react";

export default function OfficerAlertsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100">
          Field AI Risk Alerts & Anomaly Triage
        </h1>
        <p className="text-xs text-slate-400">
          High-risk entity indicators flagged by AI Anomaly Detection Engine
        </p>
      </div>

      <div className="space-y-4">
        {MOCK_ANOMALY_ALERTS.map((alt) => (
          <div
            key={alt.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="min-w-0">
                <span className="font-mono text-xs font-bold text-rose-400">
                  {alt.id}
                </span>
                <h3 className="font-bold text-sm text-slate-100 mt-0.5">
                  {alt.entityName}
                </h3>
              </div>
              <div className="shrink-0 self-start sm:self-auto">
                <RiskIndicator score={alt.riskScore} level={alt.riskLevel} />
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {alt.summary}
            </p>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 text-xs">
              <span className="font-bold text-amber-400">
                Explainable Anomaly Reasons:
              </span>
              <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-0.5">
                {alt.explainableReasons.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-indigo-950/60 border border-indigo-800 rounded-lg text-xs text-indigo-300">
              <span className="font-bold block">Suggested Action:</span>
              <span>{alt.suggestedAction}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
