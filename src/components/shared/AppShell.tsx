"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { PublicNavbar } from "@/components/landing/PublicNavbar";
import { PublicFooter } from "@/components/landing/PublicFooter";
import { HeaderNavbar } from "@/components/shared/HeaderNavbar";
import { Sidebar } from "@/components/shared/Sidebar";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import { GlobalCommandSearch } from "@/components/shared/GlobalCommandSearch";
import { Shield } from "lucide-react";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isInitialized, initAuth, role } = useAuthStore();

  // Hydrate auth state from localStorage on mount
  useEffect(() => {
    if (!isInitialized) {
      initAuth();
    }
  }, [isInitialized, initAuth]);

  // Determine if current route requires authentication
  const isDashboardRoute =
    pathname.startsWith("/beneficiary") ||
    pathname.startsWith("/officer") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auditor") ||
    pathname.startsWith("/soc");

  // Route guard: redirect unauthenticated users away from dashboard routes
  useEffect(() => {
    if (!isInitialized) return; // Wait for auth hydration

    if (isDashboardRoute && !isAuthenticated) {
      router.replace("/login");
      return;
    }

    // RBAC: ensure user can only access their own role's routes
    if (isDashboardRoute && isAuthenticated) {
      const roleRouteMap: Record<string, string> = {
        BENEFICIARY: "/beneficiary",
        OFFICER: "/officer",
        ADMIN: "/admin",
        SOC: "/soc",
      };
      const expectedPrefix = roleRouteMap[role];
      if (expectedPrefix && !pathname.startsWith(expectedPrefix)) {
        router.replace("/unauthorized");
      }
    }
  }, [
    isInitialized,
    isAuthenticated,
    isDashboardRoute,
    pathname,
    role,
    router,
  ]);

  // Public pages: landing, login, about, etc. - render immediately without blocking on auth hydration
  if (!isDashboardRoute) {
    return (
      <div className="surface-grid min-h-screen flex flex-col bg-background text-foreground font-sans w-full overflow-x-hidden">
        <PublicNavbar />
        {/* pt-14 offsets the fixed navbar (56px / 3.5rem) */}
        <main className="flex-1 w-full bg-background pt-14 px-2 sm:px-4 lg:px-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  // Protected Dashboard routes: show loading state while auth state is being hydrated
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="relative size-16 rounded-full overflow-hidden border border-border bg-white shadow-card flex items-center justify-center">
            <img
              src="/logo.png"
              alt="PDSW Official Logo"
              className="size-full object-cover"
            />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-foreground tracking-wide">
              PDSW Platform
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              Verifying session credentials...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard route but not authenticated — show nothing while redirect fires
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated Portal Dashboard Shell
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans w-full overflow-x-hidden">
      <HeaderNavbar />
      <GlobalCommandSearch />
      <div className="flex-1 flex min-w-0 overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-5 md:p-8 pb-20 md:pb-8 w-full">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
};
