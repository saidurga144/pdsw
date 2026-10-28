"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import {
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
        if (data.reset_url) {
          setGeneratedLink(data.reset_url);
        }
      } else {
        setError(
          data.error || data.detail || "Failed to request password reset.",
        );
      }
    } catch (err: any) {
      setError(err?.message || "Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-6 px-4">
      <AuthLayout
        title="Reset Account Password"
        subtitle="Enter your verified government or citizen email to receive a password reset token"
      >
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-foreground font-semibold block mb-1.5">
                Registered Email Address
              </label>
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
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Send Password Reset Link</span>
              )}
            </button>

            <div className="pt-3 text-center">
              <Link
                href="/login"
                className="text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-1"
              >
                <ArrowLeft className="size-3.5" /> Back to Login
              </Link>
            </div>
          </form>
        ) : (
          <div className="text-center py-6 space-y-4 text-xs">
            <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-secondary text-primary border border-border">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Reset Token Dispatched
            </h3>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              If an account is associated with{" "}
              <span className="text-primary font-mono font-medium">
                {email}
              </span>
              , a cryptographic reset token has been generated.
            </p>

            {generatedLink && (
              <div className="p-3 bg-secondary/50 border border-border rounded-md text-left">
                <p className="text-[11px] font-semibold text-foreground mb-1 flex items-center gap-1">
                  <KeyRound className="size-3.5 text-primary" /> Direct Reset
                  Link:
                </p>
                <Link
                  href={generatedLink}
                  className="text-[11px] text-primary underline break-all font-mono"
                >
                  {generatedLink}
                </Link>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md border border-border bg-card hover:bg-muted text-foreground font-semibold"
              >
                <ArrowLeft className="size-3.5" /> Return to Login
              </Link>
            </div>
          </div>
        )}
      </AuthLayout>
    </div>
  );
}
