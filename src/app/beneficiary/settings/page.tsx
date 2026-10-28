"use client";

import React from "react";
import { Settings, Shield, Bell, Lock, Key } from "lucide-react";

export default function BeneficiarySettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100">
          Account Security & Privacy Settings
        </h1>
        <p className="text-xs text-slate-400">
          Manage login credentials, active sessions, and notification
          preferences
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="font-bold text-sm text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Key className="w-4 h-4 text-cyan-400" /> Authentication & Password
        </h2>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-medium block mb-1">
              Current Password
            </label>
            <input
              type="password"
              placeholder="••••••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">
              New Password
            </label>
            <input
              type="password"
              placeholder="Enter minimum 12 characters..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none"
            />
          </div>

          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs">
            Update Security Password
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="font-bold text-sm text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Shield className="w-4 h-4 text-emerald-400" /> Active Session Control
        </h2>

        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
          <div>
            <p className="font-bold text-slate-200">
              Current Android PWA Session
            </p>
            <p className="text-[10px] text-slate-400">
              IP: 192.168.1.12 • Active Now
            </p>
          </div>
          <span className="text-emerald-400 font-bold text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
            THIS DEVICE
          </span>
        </div>
      </div>
    </div>
  );
}
