"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import {
  Shield,
  Lock,
  ArrowRight,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { clsx } from "clsx";

// Sections on the landing page (/ route)
const LANDING_SECTIONS = [
  { id: "platform", label: "Platform" },
  { id: "how-it-works", label: "How It Works" },
  { id: "pillars", label: "Architecture" },
  { id: "roles", label: "Roles" },
  { id: "about", label: "About" },
];

// Standalone page nav links (non-landing routes)
const PAGE_LINKS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/roles", label: "Roles" },
  { href: "/about", label: "About" },
];

function getDashboardHref(role: string) {
  const map: Record<string, string> = {
    BENEFICIARY: "/beneficiary/dashboard",
    OFFICER: "/officer/dashboard",
    ADMIN: "/admin/dashboard",
    SOC: "/soc/dashboard",
  };
  return map[role] || "/login";
}

export const PublicNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("platform");
  const [isScrolled, setIsScrolled] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const clickedRef = useRef<string | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, role, logout, getDashboardPath } = useAuthStore();
  const dashboardPath = getDashboardPath();

  const isLandingPage = pathname === "/";

  // ─── Scroll-spy with IntersectionObserver ───────────────────────────────
  useEffect(() => {
    if (!isLandingPage) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Give page time to render sections
    const setupObserver = () => {
      if (observerRef.current) observerRef.current.disconnect();

      const sectionIds = LANDING_SECTIONS.map((s) => s.id);
      const elements = sectionIds
        .map((id) => document.getElementById(id))
        .filter(Boolean) as HTMLElement[];

      if (elements.length === 0) return;

      const observer = new IntersectionObserver(
        (entries) => {
          // If user just clicked a nav item, don't override for 800ms
          if (clickedRef.current) return;

          // Find the topmost visible section
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort(
              (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
            );

          if (visible.length > 0) {
            setActiveSection(visible[0].target.id);
          }
        },
        {
          rootMargin: "-60px 0px -40% 0px",
          threshold: 0.1,
        },
      );

      elements.forEach((el) => observer.observe(el));
      observerRef.current = observer;
    };

    // Small delay so sections are rendered
    const timer = setTimeout(setupObserver, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [isLandingPage, pathname]);

  // ─── Smooth scroll to section ────────────────────────────────────────────
  const scrollToSection = useCallback(
    (sectionId: string, e?: React.MouseEvent) => {
      e?.preventDefault();
      setMobileMenuOpen(false);

      // Mark active immediately on click
      setActiveSection(sectionId);
      clickedRef.current = sectionId;

      // Clear the click lock after 800ms so scroll-spy resumes
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = setTimeout(() => {
        clickedRef.current = null;
      }, 800);

      if (!isLandingPage) {
        // Navigate to landing page then scroll
        router.push(`/#${sectionId}`);
        return;
      }

      const el = document.getElementById(sectionId);
      if (!el) return;

      const navHeight = 56; // fixed navbar height
      const top = el.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top, behavior: "smooth" });
    },
    [isLandingPage, router],
  );

  // ─── Handle hash on mount (e.g. navigated from another page) ────────────
  useEffect(() => {
    if (!isLandingPage) return;
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setTimeout(() => scrollToSection(hash), 200);
    }
  }, [isLandingPage, scrollToSection]);

  const handleLogout = async () => {
    await logout();
    router.replace("/");
    setMobileMenuOpen(false);
  };

  // ─── Determine what to render in center nav ──────────────────────────────
  const renderDesktopNavLinks = () => {
    return LANDING_SECTIONS.map((section) => {
      const isActive = isLandingPage
        ? activeSection === section.id
        : pathname === `/${section.id}` ||
          pathname === `/${section.id.replace("pillars", "architecture")}`;

      return (
        <button
          key={section.id}
          onClick={(e) => scrollToSection(section.id, e)}
          className={clsx(
            "relative py-1.5 transition-colors font-medium text-xs whitespace-nowrap cursor-pointer",
            isActive
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {section.label}
          {isActive && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-primary" />
          )}
        </button>
      );
    });
  };

  const renderMobileNavLinks = () => {
    return LANDING_SECTIONS.map((section) => {
      const isActive = isLandingPage
        ? activeSection === section.id
        : pathname === `/${section.id}` ||
          pathname === `/${section.id.replace("pillars", "architecture")}`;

      return (
        <button
          key={section.id}
          onClick={(e) => scrollToSection(section.id, e)}
          className={clsx(
            "rounded-md px-3 py-2 transition-colors flex items-center justify-between w-full text-xs font-medium cursor-pointer",
            isActive
              ? "bg-secondary text-foreground font-bold"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          )}
        >
          <span>{section.label}</span>
          {isActive && <span className="size-1.5 rounded-full bg-primary" />}
        </button>
      );
    });
  };

  return (
    <header
      className={clsx(
        "fixed left-0 right-0 top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur-xl transition-shadow duration-300",
        isScrolled ? "shadow-2xl shadow-black/20" : "shadow-none",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <button
          onClick={() => scrollToSection("platform")}
          className="flex items-center gap-2.5 group cursor-pointer"
        >
          <div className="relative flex size-9 items-center justify-center overflow-hidden rounded-xl border border-primary/50 bg-card shadow-subtle transition-transform group-hover:scale-105">
            <img
              src="/logo.png"
              alt="PDSW Official Logo"
              className="size-full object-cover"
            />
          </div>
          <div>
            <span className="display-type block text-xl font-bold tracking-tight text-foreground leading-none">
              PDSW
            </span>
            <span className="eyebrow mt-1 block text-[9px] tracking-[0.1em]">
              Secure welfare infrastructure
            </span>
          </div>
        </button>

        <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
          {renderDesktopNavLinks()}
        </nav>

        <div className="hidden sm:flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link
                href={dashboardPath}
                className="flex items-center gap-2 rounded-full bg-accent px-3.5 sm:px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary hover:text-white"
              >
                <LayoutDashboard className="size-3.5" />
                <span className="hidden sm:inline">{role} Dashboard</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-card text-xs font-semibold text-muted-foreground hover:border-destructive hover:text-destructive transition-all shadow-subtle"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-primary/90"
              >
                <Lock className="size-3.5" />
                <span>Portal Login</span>
                <ArrowRight className="size-3.5 stroke-[2.5]" />
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md text-foreground hover:bg-muted/60 lg:hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="size-5" />
          ) : (
            <Menu className="size-5" />
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-b border-border bg-card px-4 py-4 lg:hidden animate-in fade-in slide-in-from-top-2 duration-150 shadow-card">
          <div className="flex flex-col space-y-1 text-xs font-medium">
            {renderMobileNavLinks()}

            <div className="pt-3 border-t border-border flex flex-col gap-2 mt-1">
              {isAuthenticated ? (
                <>
                  <Link
                    href={dashboardPath}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-md bg-primary text-white font-bold text-xs uppercase tracking-wider"
                  >
                    Go to {role} Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-center py-2 rounded-md border border-border bg-card text-foreground text-xs font-semibold hover:text-destructive"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-md bg-primary text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Lock className="size-3.5" />
                    <span>Portal Login</span>
                    <ArrowRight className="size-3.5 stroke-[2.5]" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
