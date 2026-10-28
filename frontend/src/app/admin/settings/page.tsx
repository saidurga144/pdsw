"use client";

import React from "react";
import { Settings, Shield, Cpu, Database, Bell } from "lucide-react";

export default function SystemSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100">
          System Platform Configurations
        </h1>
        <p className="text-xs text-slate-400">
          Configure AI risk anomaly thresholds, IPFS pinning rules, and security
          controls
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="font-bold text-sm text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Cpu className="w-4 h-4 text-cyan-400" /> AI Risk Threshold Parameters
        </h2>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-medium block mb-1">
              High Risk Escalation Threshold Score
            </label>
            <input
              type="number"
              defaultValue={70}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">
              Multi-Attribute Update Timeframe Window (Days)
            </label>
            <input
              type="number"
              defaultValue={45}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="font-bold text-sm text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Database className="w-4 h-4 text-emerald-400" /> IPFS Provenance &
          Pinning Rules
        </h2>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-medium block mb-1">
              IPFS Cluster Gateway Endpoint
            </label>
            <input
              type="text"
              defaultValue="https://ipfs.pds-security.gov.in/api/v0"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
