"use client";

import React from "react";
import Link from "next/link";
import {
  UserCheck,
  Shield,
  Settings,
  Eye,
  Lock,
  ArrowRight,
} from "lucide-react";

export const RoleEcosystem: React.FC = () => {
  const roles = [
    {
      role: "beneficiary",
      title: "Beneficiary",
      subtitle: "Citizen Entitlement Portal",
      desc: "Access personal ration records, family dependents, monthly quota status, transaction receipts, and submit change requests.",
      icon: UserCheck,
      badge: "Public Service",
      href: "/login/beneficiary",
    },
    {
      role: "officer",
      title: "PDS Officer",
      subtitle: "Inspector Operational Portal",
      desc: "Manage beneficiary onboarding, document verification, attribute diff approvals, and biometric commodity distribution.",
      icon: Shield,
      badge: "Field Operations",
      href: "/login/officer",
    },
    {
      role: "admin",
      title: "Administrator",
      subtitle: "Central HQ Command",
      desc: "Oversee system-wide operations, AI risk intelligence thresholds, cryptographic integrity sweeps, and user provisioning.",
      icon: Settings,
      badge: "System Control",
      href: "/login/admin",
    },
    {
      role: "soc",
      title: "SOC Analyst",
      subtitle: "CERT-In SOC Center",
      desc: "Monitor real-time cyber threats, failed authentication spikes, RBAC violations, and explainable AI account compromises.",
      icon: Lock,
      badge: "Cyber Defense",
      href: "/login/soc",
    },
  ];

  return (
    <section
      id="roles"
      className="py-14 border-t border-border bg-background scroll-mt-14"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground bg-secondary px-3 py-1 rounded-md border border-border">
            Access Ecosystem
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
            Role-Based Platform Governance
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Dedicated portals tailored for citizens, operational inspectors,
            central administrators, forensic auditors, and cyber defense teams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.role}
                className="rounded-md border border-border bg-card p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-card hover:border-primary/50"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-md bg-secondary/50 border border-border text-primary">
                      <Icon className="size-4" />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                      {item.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-[11px] font-semibold text-primary font-mono mt-0.5">
                      {item.subtitle}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
