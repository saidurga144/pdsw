"use client";

import React from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";
import { useNotificationStore } from "@/stores/notification.store";
import { useUIStore } from "@/stores/ui.store";
import { normalizeRole } from "@/lib/role-utils";
import { Bell, Menu, Search } from "lucide-react";

export const HeaderNavbar: React.FC = () => {
  const { role } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { setMobileMenuOpen, mobileMenuOpen, setSearchOpen } = useUIStore();

  const notificationHrefByRole: Record<string, string> = {
    BENEFICIARY: "/beneficiary/notifications",
    PDS_OFFICER: "/officer/dashboard",
    ADMIN: "/admin/dashboard",
    SOC_ANALYST: "/soc/dashboard",
  };
  const notificationHref =
    notificationHrefByRole[normalizeRole(role || "")] || "/";

  return (
    <header className="glass-dashboard-header sticky top-0 z-30 shrink-0 border-b border-border bg-[var(--glass-header-surface)] text-foreground backdrop-blur-xl">
      <div className="flex min-h-16 items-center justify-between gap-3 px-3 py-2.5 sm:px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-haspopup="dialog"
            aria-expanded={mobileMenuOpen}
            aria-controls="pdsw-mobile-sidebar-navigation"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card/70 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden motion-reduce:transition-none"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>

          <Link
            href="/"
            aria-label="PDS Welfare Platform"
            className="flex min-w-0 items-center gap-2.5 rounded-lg font-bold tracking-tight text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-subtle">
              <img src="/logo.png" alt="" className="size-full object-cover" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-sm font-semibold leading-none tracking-tight text-foreground">
                PDS Welfare Platform
              </span>
              <span className="mt-1 block truncate text-[0.65rem] font-normal text-muted-foreground">
                Secure public distribution
              </span>
            </span>
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search dashboard"
            className="flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card/65 px-3 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
          >
            <Search aria-hidden="true" className="size-4 text-primary" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline">
              Ctrl+K
            </kbd>
          </button>

          <Link
            href={notificationHref}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
            className="relative inline-flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
          >
            <Bell aria-hidden="true" className="size-[1.125rem]" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-[var(--glass-surface-solid)]"
              />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};
