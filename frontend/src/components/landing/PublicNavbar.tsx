"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { clsx } from "clsx";

const links = [
  { id: "platform", label: "Overview" },
  { id: "about", label: "About" },
  { id: "how-it-works", label: "How it works" },
  { id: "security", label: "Security" },
  { id: "services", label: "Capabilities" },
];

export const PublicNavbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const isLandingPage = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const jumpTo = (id: string) => {
    setMenuOpen(false);
    if (!isLandingPage) {
      router.push(`/#${id}`);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const onHero = isLandingPage && !scrolled;
  const navText = onHero ? "text-white/85 hover:text-white" : "text-muted-foreground hover:text-foreground";

  return (
    <header className={clsx(
      "fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md transition-colors duration-300",
      onHero ? "border-white/20 bg-[#111D28]/15 text-white" : "border-border bg-white/95 text-foreground shadow-sm",
    )}>
      <div className="mx-auto flex min-h-[68px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <button onClick={() => jumpTo("platform")} className="group flex min-w-0 items-center gap-3 text-left" aria-label="PDS Welfare Platform home">
          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/50 bg-white">
            <img src="/logo.png" alt="PDSW logo" className="size-[38px] object-contain" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className={clsx("block truncate text-sm font-semibold tracking-tight", onHero ? "text-white" : "text-foreground")}>PDS Welfare Platform</span>
            <span className={clsx("mt-0.5 block truncate text-[10px] font-medium tracking-wide", onHero ? "text-white/75" : "text-muted-foreground")}>Secure public distribution services</span>
          </span>
        </button>

        <nav className="hidden items-center gap-5 xl:gap-6 lg:flex" aria-label="Main navigation">
          {links.map((item) => (
            <button key={item.id} onClick={() => jumpTo(item.id)} className={clsx("relative whitespace-nowrap pb-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", navText)}>
              {item.label}
            </button>
          ))}
          <span className={clsx("mx-1 h-6 w-px", onHero ? "bg-white/30" : "bg-border")} />
          <Link href="/login" className={clsx("whitespace-nowrap text-xs font-semibold transition-colors", navText)}>Sign in</Link>
          <Link href="/login" className="inline-flex items-center justify-center bg-primary px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary">Get started</Link>
        </nav>

        <button onClick={() => setMenuOpen((open) => !open)} className={clsx("flex size-10 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden", onHero ? "text-white hover:bg-white/10" : "text-foreground hover:bg-secondary")} aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen}>
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-border bg-white px-4 py-4 shadow-lg lg:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-1">
            {links.map((item) => (
              <button key={item.id} onClick={() => jumpTo(item.id)} className="rounded-sm px-3 py-3 text-left text-sm font-medium text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{item.label}</button>
            ))}
            <Link href="/login" onClick={() => setMenuOpen(false)} className="mt-2 flex min-h-11 items-center justify-center bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover">Sign in / Get started</Link>
          </div>
        </nav>
      )}
    </header>
  );
};
