'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="py-6 px-4">
      <AuthLayout
        title="Reset Account Password"
        subtitle="Enter your verified government or citizen email to receive a password reset token"
      >
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-foreground font-semibold block mb-1.5">Registered Email Address</label>
              <div className="relative">
                <Mail className="size-4 text-muted-foreground absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@pds.gov.in"
                  className="w-full bg-background border border-border rounded-md pl-10 pr-3 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle"
            >
              Send Password Reset Link
            </button>

            <div className="pt-3 text-center">
              <Link href="/login" className="text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-1">
                <ArrowLeft className="size-3.5" /> Back to Login
              </Link>
            </div>
          </form>
        ) : (
          <div className="text-center py-6 space-y-4 text-xs">
            <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-secondary text-primary border border-border">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">Reset Token Dispatched</h3>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              If an account is associated with <span className="text-primary font-mono font-medium">{email}</span>, a cryptographic reset token has been sent.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md border border-border bg-card hover:bg-muted text-foreground font-semibold"
            >
              <ArrowLeft className="size-3.5" /> Return to Login
            </Link>
          </div>
        )}
      </AuthLayout>
    </div>
  );
}
