'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Shield, Key, CheckCircle2, AlertCircle, ArrowRight, UserPlus } from 'lucide-react';

export default function SetupPage() {
  const [formData, setFormData] = useState({
    bootstrapToken: '',
    fullName: '',
    email: '',
    password: '',
    phone: '',
    jurisdiction: 'National Headquarters, New Delhi',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdAdmin, setCreatedAdmin] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.phone && formData.phone.length !== 10) {
      setError('Mobile number must be exactly 10 digits.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to initialize administrator.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setCreatedAdmin(data.user);
    } catch (err: any) {
      setError(err?.message || 'Network error while initializing admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center mx-auto text-cyan-400">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            PDS Welfare System Setup
          </h1>
          <p className="text-xs text-slate-400">
            Clean Installation: Initialize First Administrator Account
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
          {success ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">System Initialized Successfully!</h2>
                <p className="text-xs text-slate-400 mt-1">
                  First administrator account created for <span className="text-cyan-400 font-mono font-bold">{createdAdmin?.email}</span>.
                </p>
                <p className="text-[11px] text-amber-400 mt-2 bg-amber-950/40 p-2.5 rounded-lg border border-amber-800/60">
                  The bootstrap endpoint is now permanently disabled for security.
                </p>
              </div>

              <Link
                href="/auth/login"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow flex items-center justify-center gap-2"
              >
                <span>Proceed to Login</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  Bootstrap Secret Token *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter BOOTSTRAP_ADMIN_SECRET from backend/.env"
                  value={formData.bootstrapToken}
                  onChange={(e) => setFormData({ ...formData, bootstrapToken: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Configured in backend/.env under BOOTSTRAP_ADMIN_SECRET.
                </span>
              </div>

              <div className="border-t border-slate-800/80 pt-3 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Administrator Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. System Administrator"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Official Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. admin@yourdomain.gov.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Create a strong password (min. 8 characters)"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Mobile Phone (10 Digits, Optional)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: digitsOnly });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    {formData.phone ? `${formData.phone.length}/10 digits` : '10-digit mobile number'}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Jurisdiction / Office
                  </label>
                  <input
                    type="text"
                    value={formData.jurisdiction}
                    onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Initializing Administrator...' : 'Initialize System'}</span>
              </button>

              <div className="text-center pt-2">
                <Link href="/auth/login" className="text-xs text-slate-400 hover:text-cyan-400 transition-colors">
                  Already initialized? Go to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
