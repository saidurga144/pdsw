import React from 'react';
import Link from 'next/link';
import { MapPin, Phone, Mail, ShieldCheck, Lock, Database, Cpu } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="border-t border-border bg-background text-foreground">
      {/* ── Main grid ── */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* ── Column 1 — Brand ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="relative size-9 rounded-xl overflow-hidden border border-border bg-white shadow-subtle flex items-center justify-center shrink-0">
                <img src="/logo.png" alt="PDSW Official Logo" className="size-full object-cover" />
              </div>
              <span className="font-bold text-[15px] text-foreground tracking-tight leading-tight">
                PDS Welfare Platform
              </span>
            </div>

            {/* Description matches hero section text */}
            <p className="text-[12.5px] text-muted-foreground leading-relaxed max-w-[240px]">
              Making the Public Distribution System simple, secure, and transparent for
              administrators, PDS officers, and beneficiaries.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-primary font-medium">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              <span>National Security Ledger Active</span>
            </div>
          </div>

          {/* ── Column 2 — Navigation (Home → About Us → Services) ── */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-foreground uppercase tracking-[0.12em]">
              Navigation
            </h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Home',         href: '/#platform' },
                { label: 'About Us',     href: '/#about' },
                { label: 'Services',     href: '/#services' },
                { label: 'Portal Login', href: '/login' },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[12.5px] text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Column 3 — Contact ── */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-foreground uppercase tracking-[0.12em]">
              Contact
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-[12.5px] text-muted-foreground">
                <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Department of Food &amp; Public Distribution,<br />
                  Krishi Bhawan, New Delhi — 110001
                </span>
              </li>
              <li className="flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
                <Phone className="size-3.5 text-primary shrink-0" />
                <span>+91 11 2338 3553</span>
              </li>
              <li className="flex items-center gap-2.5 text-[12.5px] text-muted-foreground">
                <Mail className="size-3.5 text-primary shrink-0" />
                <span>support@pdsw.gov.in</span>
              </li>
            </ul>
          </div>

          {/* ── Column 4 — Core Pillars ── */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-foreground uppercase tracking-[0.12em]">
              Core Pillars
            </h4>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                <Cpu className="size-3.5 text-primary shrink-0" />
                <span>AI Anomaly Detection</span>
              </li>
              <li className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary shrink-0" />
                <span>SHA-256 Hash Integrity</span>
              </li>
              <li className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                <Database className="size-3.5 text-primary shrink-0" />
                <span>IPFS Decentralized Provenance</span>
              </li>
              <li className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                <Lock className="size-3.5 text-primary shrink-0" />
                <span>Zero-Knowledge Privacy</span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <p>© 2026 PDS Welfare Platform. Secure &amp; Transparent Public Distribution.</p>
          <p>Compliant with National Cyber Security Policy &amp; Open Government Data Standards.</p>
        </div>
      </div>
    </footer>
  );
};
