'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { clsx } from 'clsx';

const LANDING_SECTIONS = [
  { id: 'platform', label: 'Home' },
  { id: 'about',    label: 'About Us' },
  { id: 'services', label: 'Services' },
];

export const PublicNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection]   = useState<string>('platform');
  const [isScrolled, setIsScrolled]         = useState(false);

  const observerRef   = useRef<IntersectionObserver | null>(null);
  const clickedRef    = useRef<string | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathname = usePathname();
  const router   = useRouter();
  const isLandingPage = pathname === '/';

  /* ── Scroll-spy ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isLandingPage) return;

    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });

    const setup = () => {
      observerRef.current?.disconnect();
      const els = LANDING_SECTIONS
        .map((s) => document.getElementById(s.id))
        .filter(Boolean) as HTMLElement[];
      if (!els.length) return;

      const io = new IntersectionObserver(
        (entries) => {
          if (clickedRef.current) return;
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible.length) setActiveSection(visible[0].target.id);
        },
        { rootMargin: '-64px 0px -40% 0px', threshold: 0.1 }
      );
      els.forEach((el) => io.observe(el));
      observerRef.current = io;
    };

    const t = setTimeout(setup, 100);
    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
      observerRef.current?.disconnect();
    };
  }, [isLandingPage, pathname]);

  /* ── Smooth-scroll ───────────────────────────────────────────────────── */
  const scrollToSection = useCallback(
    (sectionId: string, e?: React.MouseEvent) => {
      e?.preventDefault();
      setMobileMenuOpen(false);
      setActiveSection(sectionId);
      clickedRef.current = sectionId;
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = setTimeout(() => { clickedRef.current = null; }, 800);

      if (!isLandingPage) { router.push(`/#${sectionId}`); return; }

      const el = document.getElementById(sectionId);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    },
    [isLandingPage, router]
  );

  /* ── Hash-on-mount ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isLandingPage) return;
    const hash = window.location.hash.replace('#', '');
    if (hash) setTimeout(() => scrollToSection(hash), 200);
  }, [isLandingPage, scrollToSection]);

  /* ── Desktop nav links ───────────────────────────────────────────────── */
  const DesktopNavLinks = () => (
    <>
      {LANDING_SECTIONS.map((s) => {
        const isActive = isLandingPage
          ? activeSection === s.id
          : pathname === `/${s.id}`;

        return (
          <button
            key={s.id}
            onClick={(e) => scrollToSection(s.id, e)}
            className={clsx(
              'relative pb-0.5 text-[13px] font-medium transition-colors duration-150 whitespace-nowrap cursor-pointer',
              isActive
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {s.label}
            {isActive && (
              <span className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </>
  );

  /* ── Mobile nav links ────────────────────────────────────────────────── */
  const MobileNavLinks = () => (
    <>
      {LANDING_SECTIONS.map((s) => {
        const isActive = isLandingPage ? activeSection === s.id : pathname === `/${s.id}`;
        return (
          <button
            key={s.id}
            onClick={(e) => scrollToSection(s.id, e)}
            className={clsx(
              'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer',
              isActive
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
            )}
          >
            <span>{s.label}</span>
            {isActive && <span className="size-1.5 rounded-full bg-primary" />}
          </button>
        );
      })}
    </>
  );

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <header
      className={clsx(
        'fixed left-0 right-0 top-0 z-50 w-full bg-background/90 backdrop-blur-xl border-b border-border/60 transition-all duration-300',
        isScrolled ? 'shadow-[0_2px_20px_rgba(0,0,0,0.08)]' : 'shadow-none'
      )}
    >
      <div
        className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-8 lg:px-10"
        style={{ minHeight: '72px' }}
      >
        {/* LEFT — Branding ─────────────────────────────────────────── */}
        <button
          onClick={() => scrollToSection('platform')}
          className="flex items-center gap-3 shrink-0 group cursor-pointer"
          aria-label="Go to home"
        >
          <div
            className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-subtle transition-transform duration-200 group-hover:scale-105"
            style={{ width: 44, height: 44 }}
          >
            <img
              src="/logo.png"
              alt="PDSW Logo"
              className="object-contain"
              style={{ width: 40, height: 40 }}
            />
          </div>
          <div className="text-left leading-none">
            <span className="block text-[15px] font-bold tracking-tight text-foreground leading-tight">
              PDS Welfare Platform
            </span>
            <span className="block text-[10.5px] text-muted-foreground font-medium tracking-wide mt-0.5 leading-tight">
              Secure &amp; Transparent Public Distribution
            </span>
          </div>
        </button>

        {/* RIGHT — Public navigation (desktop) ─────────────────────── */}
        <div className="hidden lg:flex items-center gap-7 xl:gap-8">
          <nav className="flex items-center gap-6 xl:gap-7">
            <DesktopNavLinks />
          </nav>
        </div>

        {/* Mobile hamburger ────────────────────────────────────────── */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center justify-center rounded-lg p-2 text-foreground hover:bg-secondary transition-colors lg:hidden"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-card/98 backdrop-blur-xl px-4 py-4 lg:hidden animate-in fade-in slide-in-from-top-2 duration-150 shadow-lg">
          <nav className="flex flex-col gap-0.5 mb-4">
            <MobileNavLinks />
          </nav>

        </div>
      )}
    </header>
  );
};
