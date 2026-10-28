"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
} from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token.trim()) {
      setError("A valid reset token is required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), new_password: password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        setError(data.detail || data.error || "Failed to update password.");
      }
    } catch (err: any) {
      setError(err?.message || "Network error updating password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!tokenFromUrl && (
            <div>
              <label className="text-foreground font-semibold block mb-1.5">
                Reset Token
              </label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your reset token here..."
                className="w-full bg-background border border-border rounded-md p-2.5 text-xs text-foreground font-mono focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-foreground font-semibold block mb-1.5">
              New Password (Min 6 Characters)
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password..."
              className="w-full bg-background border border-border rounded-md p-2.5 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-foreground font-semibold block mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password..."
              className="w-full bg-background border border-border rounded-md p-2.5 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Update Password & Sign In</span>
            )}
          </button>
        </form>
      ) : (
        <div className="text-center py-6 space-y-4 text-xs">
          <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-secondary text-primary border border-border">
            <CheckCircle2 className="size-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            Password Updated Successfully
          </h3>
          <p className="text-muted-foreground text-[11px]">
            Your account credentials have been cryptographically updated in the
            database.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-primary text-white font-bold uppercase tracking-wider text-xs shadow-subtle"
          >
            <span>Login to Portal</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="py-6 px-4">
      <AuthLayout
        title="Set New Password"
        subtitle="Choose a secure password for your government or citizen account"
      >
        <Suspense
          fallback={
            <div className="p-4 text-center text-xs text-muted-foreground">
              Loading reset form...
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </AuthLayout>
    </div>
  );
}
