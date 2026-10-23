import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, Database, Cpu } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="border-t border-border bg-card text-muted-foreground text-xs">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex size-8 items-center justify-center overflow-hidden rounded-xl border border-primary/50 bg-background shadow-subtle">
                <img
                  src="/logo.png"
                  alt="PDSW Logo"
                  className="size-full object-cover"
                />
              </div>
              <span className="display-type text-base font-bold text-foreground">PDSW Platform</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              AI-Driven Privacy-Preserving IPFS-Based Framework for Provenance-Driven Secure Welfare-distribution.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-primary font-mono font-medium">
              <span className="size-2 rounded-full bg-primary" />
              <span>National Security Ledger Active</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Core Pillars</h4>
            <ul className="space-y-2 text-[11px]">
              <li className="flex items-center gap-1.5"><Cpu className="size-3 text-primary" /> AI Anomaly Detection</li>
              <li className="flex items-center gap-1.5"><ShieldCheck className="size-3 text-primary" /> SHA-256 Hash Integrity</li>
              <li className="flex items-center gap-1.5"><Database className="size-3 text-primary" /> IPFS Decentralized Provenance</li>
              <li className="flex items-center gap-1.5"><Lock className="size-3 text-primary" /> Zero-Knowledge Privacy</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Platform Portals</h4>
            <ul className="space-y-2 text-[11px]">
              <li><Link href="/login/beneficiary" className="hover:text-primary transition-colors">Citizen Beneficiary Portal</Link></li>
              <li><Link href="/login/officer" className="hover:text-primary transition-colors">PDS Operational Inspector</Link></li>
              <li><Link href="/login/admin" className="hover:text-primary transition-colors">Central System Administrator</Link></li>
              <li><Link href="/login/auditor" className="hover:text-primary transition-colors">CAG Compliance Auditor</Link></li>
              <li><Link href="/login/soc" className="hover:text-primary transition-colors">Cyber SOC Analyst Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Governance & Architecture</h4>
            <ul className="space-y-2 text-[11px]">
              <li><Link href="/how-it-works" className="hover:text-primary transition-colors">Cryptographic Verification Workflow</Link></li>
              <li><Link href="/roles" className="hover:text-primary transition-colors">Role-Based Access Portals</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">Architecture Whitepaper</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground font-mono">
          <p>© 2026 PDSW. AI-Driven Privacy-Preserving Welfare Distribution Framework.</p>
          <p>Compliant with National Cyber Security Policy & Open Government Data Standards.</p>
        </div>
      </div>
    </footer>
  );
};
