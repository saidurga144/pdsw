'use client';

import React from 'react';
import { Activity, ArrowRight, Building, CheckCircle2 } from 'lucide-react';

export default function MigrationTransferPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100">Inter-District Migration & FPS Center Transfer</h1>
        <p className="text-xs text-slate-400">Process beneficiary location transfers with continuous state hash provenance</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
        <h2 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-3">
          Transfer Flow Architecture
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <Building className="w-5 h-5 text-slate-400 mx-auto" />
            <p className="font-bold text-slate-200">1. Current FPS #102</p>
            <p className="text-[10px] text-slate-400">South Delhi Sector</p>
          </div>

          <div className="flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-cyan-400 hidden md:block" />
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <Activity className="w-5 h-5 text-amber-400 mx-auto" />
            <p className="font-bold text-slate-200">2. Transfer Request</p>
            <p className="text-[10px] text-slate-400">Pending Review</p>
          </div>

          <div className="flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-cyan-400 hidden md:block" />
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
            <p className="font-bold text-slate-200">3. New FPS Assignment</p>
            <p className="text-[10px] text-slate-400">FPS #108 Lajpat Nagar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
