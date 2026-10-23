'use client';

import React from 'react';
import { Shield, Key } from 'lucide-react';

export default function BeneficiarySettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="ben-title text-foreground">Account Security & Settings</h1>
        <p className="text-xs text-muted-foreground">
          Manage login credentials, active sessions, and notification preferences
        </p>
      </div>

      <div className="bg-card border border-border rounded-md p-5 space-y-4 shadow-subtle">
        <h2 className="ben-section-title text-foreground flex items-center gap-2 border-b border-border pb-3">
          <Key className="size-4 text-primary shrink-0" /> Authentication &amp; Password
        </h2>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-foreground font-semibold block mb-1">Current Password</label>
            <input
              type="password"
              placeholder="••••••••••••"
              className="w-full bg-background border border-border rounded-md p-2.5 text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-foreground font-semibold block mb-1">New Password</label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              className="w-full bg-background border border-border rounded-md p-2.5 text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <button className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-md text-xs transition-colors">
            Update Password
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-md p-5 space-y-4 shadow-subtle">
        <h2 className="ben-section-title text-foreground flex items-center gap-2 border-b border-border pb-3">
          <Shield className="size-4 text-primary shrink-0" /> Active Session
        </h2>

        <div className="p-3 bg-muted/40 border border-border rounded-md flex items-center justify-between text-xs">
          <div>
            <p className="font-bold text-foreground">Current Session</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Active Now</p>
          </div>
          <span className="text-primary font-bold text-[10px] bg-secondary px-2 py-0.5 rounded border border-border">
            THIS DEVICE
          </span>
        </div>
      </div>
    </div>
  );
}
