"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { getRoleLabel, parseRole } from "@/lib/role-utils";
import {
  GlassSidebar,
  GlassSidebarBody,
  GlassSidebarFooter,
  GlassSidebarGroup,
  GlassSidebarHeader,
  GlassSidebarItem,
  GlassSidebarToggle,
} from "@/components/shared/glass-sidebar";
import {
  getDashboardNavGroups,
  getDashboardNavState,
} from "@/components/shared/sidebar-navigation";
import { cn } from "@/lib/utils";

function getInitials(name?: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function UserAvatar({
  name,
  avatarUrl,
  className,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  className?: string;
}) {
  const [imageUnavailable, setImageUnavailable] = useState(false);

  useEffect(() => setImageUnavailable(false), [avatarUrl]);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--glass-border)] bg-primary/10 text-xs font-bold text-primary",
        className,
      )}
    >
      {avatarUrl && !imageUnavailable ? (
        <img
          src={avatarUrl}
          alt=""
          className="size-full object-cover"
          onError={() => setImageUnavailable(true)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}

function AccountFooter({
  collapsed,
  onLogout,
  logoutError,
  isLoggingOut,
}: {
  collapsed: boolean;
  onLogout: () => void;
  logoutError: string;
  isLoggingOut: boolean;
}) {
  const { user, role } = useAuthStore();
  const accountDetailsRef = useRef<HTMLDetailsElement>(null);
  const name = user?.name?.trim() || "Account";
  const email = user?.email?.trim() || "";
  const avatarUrl = user?.avatarUrl || user?.avatar;
  const canonicalRole = role ? parseRole(role) : null;
  const roleLabel = canonicalRole ? getRoleLabel(canonicalRole) : "Account";

  useEffect(() => {
    if (!collapsed) {
      if (accountDetailsRef.current) accountDetailsRef.current.open = false;
      return;
    }

    const closeWhenOutside = (event: MouseEvent) => {
      const details = accountDetailsRef.current;
      if (details && !details.contains(event.target as Node)) details.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && accountDetailsRef.current?.open) {
        accountDetailsRef.current.open = false;
        accountDetailsRef.current.querySelector("summary")?.focus();
      }
    };

    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [collapsed]);

  if (collapsed) {
    return (
      <div className="space-y-2">
        <details ref={accountDetailsRef} className="relative flex justify-center">
          <summary
            aria-label={`Account menu for ${name}`}
            title={`${name} · ${roleLabel}`}
            className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--glass-surface-solid)] [&::-webkit-details-marker]:hidden"
          >
            <UserAvatar name={name} avatarUrl={avatarUrl} />
          </summary>
          <div className="glass-sidebar-popover fixed bottom-3 left-[calc(4.5rem+0.75rem)] z-[60] w-64 rounded-2xl border p-4 shadow-elevated">
            <div className="flex items-center gap-3">
              <UserAvatar name={name} avatarUrl={avatarUrl} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
                <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-wide text-primary">
                  {roleLabel}
                </p>
              </div>
            </div>
            {logoutError && <p role="alert" className="mt-3 text-xs text-destructive">{logoutError}</p>}
            <button
              type="button"
              onClick={onLogout}
              disabled={isLoggingOut}
              className="mt-4 flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 motion-reduce:transition-none"
            >
              <LogOut aria-hidden="true" className="size-4" />
              {isLoggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="glass-sidebar-profile flex min-w-0 items-center gap-3 rounded-xl bg-[var(--glass-hover)] p-2.5">
        <UserAvatar name={name} avatarUrl={avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-5 text-foreground">{name}</p>
          {email && <p className="truncate text-xs leading-4 text-muted-foreground">{email}</p>}
          <p className="mt-1 truncate text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-primary">
            {roleLabel}
          </p>
        </div>
      </div>
      {logoutError && <p role="alert" className="px-1 text-xs text-destructive">{logoutError}</p>}
      <button
        type="button"
        onClick={onLogout}
        disabled={isLoggingOut}
        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 motion-reduce:transition-none"
      >
        <LogOut aria-hidden="true" className="size-[1.125rem] shrink-0" />
        <span>{isLoggingOut ? "Signing out…" : "Sign out"}</span>
      </button>
    </div>
  );
}

function SidebarNavigation({
  collapsed,
  onNavigate,
  indicatorId,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  indicatorId: string;
}) {
  const pathname = usePathname();
  const { role } = useAuthStore();
  const prefersReducedMotion = useReducedMotion();
  const groups = getDashboardNavGroups(role);

  return (
    <>
      {groups.map((group) => (
        <GlassSidebarGroup key={group.label} label={group.label} collapsed={collapsed}>
          <div className="space-y-1">
            {group.items.map((item) => {
              const routeState = getDashboardNavState(pathname, item.href);
              return (
                <GlassSidebarItem
                  key={item.href}
                  {...item}
                  active={routeState.active}
                  current={routeState.current}
                  collapsed={collapsed}
                  reducedMotion={Boolean(prefersReducedMotion)}
                  indicatorId={indicatorId}
                  onNavigate={onNavigate}
                />
              );
            })}
          </div>
        </GlassSidebarGroup>
      ))}
    </>
  );
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useUIStore();
  const { logout, isLoading } = useAuthStore();
  const [logoutError, setLogoutError] = useState("");
  const mobileDialogRef = useRef<HTMLDialogElement>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = mobileDialogRef.current;
    if (!dialog) return;

    if (mobileMenuOpen && !dialog.open) {
      dialog.showModal();
      mobileCloseButtonRef.current?.focus();
    } else if (!mobileMenuOpen && dialog.open) {
      dialog.close();
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const closeDrawerOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileMenuOpen(false);
    };
    mediaQuery.addEventListener("change", closeDrawerOnDesktop);
    return () => mediaQuery.removeEventListener("change", closeDrawerOnDesktop);
  }, [setMobileMenuOpen]);

  const handleLogout = async () => {
    setLogoutError("");
    try {
      await logout();
      setMobileMenuOpen(false);
      router.replace("/login");
    } catch {
      setLogoutError("Sign out failed. Please try again.");
    }
  };

  const { user, role } = useAuthStore();
  const canonicalRole = role ? parseRole(role) : null;
  const roleLabel = canonicalRole ? getRoleLabel(canonicalRole) : "Dashboard";

  return (
    <>
      <GlassSidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        className="z-20"
      >
        <GlassSidebarHeader
          className={cn(
            "justify-between gap-2",
            sidebarCollapsed && "flex-col justify-center gap-1 px-2 py-2",
          )}
        >
          <Link
            href={canonicalRole ? getDashboardNavGroups(role)[0]?.items[0]?.href || "/" : "/"}
            aria-label="PDS Welfare Platform home"
            title={sidebarCollapsed ? "PDS Welfare Platform" : undefined}
            className={cn(
              "flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary",
              sidebarCollapsed && "justify-center",
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--glass-border)] bg-white shadow-subtle">
              <img src="/logo.png" alt="" className="size-full object-cover" />
            </span>
            {!sidebarCollapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold leading-4 text-foreground">PDSW</span>
                <span className="block truncate text-[0.64rem] leading-4 text-muted-foreground">{roleLabel} portal</span>
              </span>
            )}
          </Link>
          <GlassSidebarToggle />
        </GlassSidebarHeader>

        <GlassSidebarBody>
          <SidebarNavigation
            collapsed={sidebarCollapsed}
            indicatorId="pdsw-desktop-sidebar-active"
          />
        </GlassSidebarBody>

        <GlassSidebarFooter>
          <AccountFooter
            collapsed={sidebarCollapsed}
            onLogout={handleLogout}
            logoutError={logoutError}
            isLoggingOut={isLoading}
          />
        </GlassSidebarFooter>
      </GlassSidebar>

      <dialog
        ref={mobileDialogRef}
        aria-labelledby="pdsw-mobile-sidebar-title"
        className="glass-sidebar-dialog fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-foreground open:flex md:hidden"
        onClose={() => setMobileMenuOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) mobileDialogRef.current?.close();
        }}
      >
        <aside className="glass-sidebar-drawer flex h-full w-[min(86vw,20rem)] max-w-[20rem] flex-col overflow-hidden border-r border-[var(--glass-border)]">
          <div className="flex min-h-16 shrink-0 items-center justify-between border-b border-[var(--glass-border)] px-4 py-2">
            <Link
              href={canonicalRole ? getDashboardNavGroups(role)[0]?.items[0]?.href || "/" : "/"}
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--glass-border)] bg-white shadow-subtle">
                <img src="/logo.png" alt="" className="size-full object-cover" />
              </span>
              <span className="min-w-0">
                <span id="pdsw-mobile-sidebar-title" className="block truncate text-sm font-bold text-foreground">PDS Welfare Platform</span>
                <span className="block truncate text-xs text-muted-foreground">{roleLabel}</span>
              </span>
            </Link>
            <button
              ref={mobileCloseButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-[var(--glass-hover)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
            >
              <span aria-hidden="true" className="text-xl leading-none">×</span>
            </button>
          </div>

          <nav
            id="pdsw-mobile-sidebar-navigation"
            aria-label="Dashboard navigation"
            className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4"
          >
            <SidebarNavigation
              collapsed={false}
              indicatorId="pdsw-mobile-sidebar-active"
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </nav>

          <div className="shrink-0 border-t border-[var(--glass-border)] p-3">
            <AccountFooter
              collapsed={false}
              onLogout={handleLogout}
              logoutError={logoutError}
              isLoggingOut={isLoading}
            />
          </div>
          {user?.name && <span className="sr-only">Signed in as {user.name}</span>}
        </aside>
      </dialog>
    </>
  );
};
