"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
}) => {
  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-4 sm:py-6 px-2 sm:px-6 lg:px-8 bg-background">
      <div className="mx-auto w-full max-w-[min(92vw,80rem)] overflow-hidden rounded-md border border-border bg-card shadow-card">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">
          <div className="hidden lg:flex lg:col-span-5 bg-muted/40 p-6 xl:p-8 flex-col justify-center border-r border-border relative overflow-hidden">
            <div className="space-y-4 relative z-10">
              <Link href="/" className="flex items-center gap-3">
                <div className="relative size-11 rounded-full overflow-hidden border border-border bg-white shadow-subtle flex items-center justify-center shrink-0">
                  <img
                    src="/logo.png"
                    alt="PDSW Logo"
                    className="size-full object-cover"
                  />
                </div>
                <div>
                  <span className="block text-base font-extrabold tracking-wider text-foreground">
                    PDSW
                  </span>
                  <span className="block text-[10px] font-mono text-muted-foreground">
                    Provenance-Driven Secure Welfare-distribution
                  </span>
                </div>
              </Link>

              <div className="pt-4 space-y-2 text-xs text-muted-foreground">
                <p className="leading-relaxed">
                  Secure role-based access to India&apos;s Provenance-Driven
                  Secure Welfare-distribution platform.
                </p>
                <p className="leading-relaxed">
                  All sessions are encrypted and audit-logged in real time.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 p-4 sm:p-6 lg:p-8 flex flex-col justify-center bg-card">
            <div className="mx-auto w-full max-w-md space-y-5 sm:space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  {title}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              </div>

              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
