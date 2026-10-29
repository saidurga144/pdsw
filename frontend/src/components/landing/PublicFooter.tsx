import React from "react";
import Link from "next/link";
import { Database, ShieldCheck } from "lucide-react";

const links = [
  { href: "/", label: "Overview" },
  { href: "/about", label: "About PDSW" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/roles", label: "Role access" },
  { href: "/login", label: "Sign in" },
];

export const PublicFooter: React.FC = () => (
  <footer className="border-t border-[#263440] bg-[#111D28] text-white">
    <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.2fr_0.8fr_1fr] lg:px-10 lg:py-16">
      <div>
        <Link href="/" className="mb-4 inline-flex items-center gap-3">
          <span className="flex size-10 items-center justify-center overflow-hidden rounded-md bg-white">
            <img src="/logo.png" alt="PDSW logo" className="size-[38px] object-contain" />
          </span>
          <span className="text-sm font-semibold">PDS Welfare Platform</span>
        </Link>
        <p className="max-w-sm text-sm leading-6 text-white/75">Digital services for beneficiary accounts, public distribution workflows, and reviewable records.</p>
      </div>
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">Platform</h2>
        <ul className="space-y-3">
          {links.map((item) => <li key={item.href}><Link href={item.href} className="text-sm text-white/75 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">{item.label}</Link></li>)}
        </ul>
      </div>
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">Built-in workflows</h2>
        <ul className="space-y-3 text-sm text-white/75">
          <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-orange-300" />Account and role access</li>
          <li className="flex items-center gap-2"><Database className="size-4 text-orange-300" />Record and integrity review</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-[#263440]">
      <p className="mx-auto max-w-[1280px] px-5 py-4 text-xs text-white/60 sm:px-8 lg:px-10">© 2026 PDS Welfare Platform</p>
    </div>
  </footer>
);
