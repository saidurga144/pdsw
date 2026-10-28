"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="py-6 px-4">
      <AuthLayout
        title="Set New Password"
        subtitle="Choose a secure password for your government/citizen account"
      >
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-foreground font-semibold block mb-1.5">
                New Security Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 12 characters..."
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
                placeholder="Re-enter password..."
                className="w-full bg-background border border-border rounded-md p-2.5 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle"
            >
              Update Password & Sign In
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
              Your account credentials have been cryptographically updated.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-primary text-white font-bold uppercase tracking-wider text-xs"
            >
              <span>Login to Portal</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
      </AuthLayout>
    </div>
  );
}
