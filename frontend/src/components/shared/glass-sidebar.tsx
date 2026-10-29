"use client";

import React, { createContext, useContext, useEffect, useId, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GlassSidebarProps {
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
  children: React.ReactNode;
}

interface GlassSidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
}

const GlassSidebarContext = createContext<GlassSidebarContextValue | null>(null);

export function GlassSidebar({
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  className,
  children,
}: GlassSidebarProps) {
  const isControlled = collapsed !== undefined;
  const [internalCollapsed, setInternalCollapsed] =
    useState(defaultCollapsed);
  const isCollapsed = collapsed ?? internalCollapsed;

  useEffect(() => {
    if (isControlled) setInternalCollapsed(collapsed);
  }, [collapsed, isControlled]);

  const setCollapsed = (nextCollapsed: boolean) => {
    if (!isControlled) setInternalCollapsed(nextCollapsed);
    onCollapsedChange?.(nextCollapsed);
  };

  const contextValue: GlassSidebarContextValue = {
    collapsed: isCollapsed,
    toggle: () => setCollapsed(!isCollapsed),
  };

  return (
    <GlassSidebarContext.Provider value={contextValue}>
      <aside
        data-collapsed={isCollapsed}
        aria-label="Dashboard sidebar"
        className={cn(
          "glass-sidebar hidden h-[calc(100dvh-4rem)] min-h-0 shrink-0 flex-col overflow-hidden md:sticky md:top-16 md:flex",
          "transition-[width] duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
          isCollapsed ? "w-[4.5rem]" : "w-60",
          className,
        )}
      >
        {children}
      </aside>
    </GlassSidebarContext.Provider>
  );
}

export function GlassSidebarHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-16 shrink-0 items-center border-b border-[var(--glass-border)] px-3 py-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function GlassSidebarBody({
  children,
  className,
  id = "pdsw-dashboard-sidebar-navigation",
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <nav
      id={id}
      aria-label="Dashboard navigation"
      className={cn(
        "min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain px-2 py-4",
        className,
      )}
    >
      {children}
    </nav>
  );
}

export interface GlassSidebarGroupProps {
  label: string;
  children: React.ReactNode;
  collapsed?: boolean;
  className?: string;
}

export function GlassSidebarGroup({
  label,
  children,
  collapsed,
  className,
}: GlassSidebarGroupProps) {
  const context = useContext(GlassSidebarContext);
  const isCollapsed = collapsed ?? context?.collapsed ?? false;
  const labelId = `sidebar-group-${useId().replace(/:/g, "")}`;

  return (
    <section
      role="group"
      aria-labelledby={labelId}
      className={cn("space-y-1", className)}
    >
      {isCollapsed ? (
        <>
          <h2 id={labelId} className="sr-only">
            {label}
          </h2>
          <div
            aria-hidden="true"
            className="mx-auto mb-2 mt-1 h-px w-8 bg-[var(--glass-border)]"
          />
        </>
      ) : (
        <h2
          id={labelId}
          className="truncate px-3 pb-1 pt-1 text-[0.66rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground"
        >
          {label}
        </h2>
      )}
      {children}
    </section>
  );
}

export interface GlassSidebarItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  current?: boolean;
  collapsed?: boolean;
  badge?: React.ReactNode;
  indicatorId?: string;
  reducedMotion?: boolean;
  onNavigate?: () => void;
  className?: string;
}

export function GlassSidebarItem({
  href,
  label,
  icon: Icon,
  active = false,
  current = false,
  collapsed = false,
  badge,
  indicatorId = "pdsw-sidebar-active",
  reducedMotion = false,
  onNavigate,
  className,
}: GlassSidebarItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-label={collapsed ? label : undefined}
      aria-current={current ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "glass-sidebar-item group relative flex min-h-11 w-full items-center rounded-xl text-sm font-medium outline-none",
        "transition-[color,background-color,transform] duration-200 hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:hover:translate-x-0",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--glass-surface-solid)]",
        collapsed ? "justify-center px-2" : "gap-3 px-3",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:bg-[var(--glass-hover)] hover:text-foreground",
        className,
      )}
    >
      {active && (
        <motion.span
          aria-hidden="true"
          layoutId={indicatorId}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 520, damping: 38 }
          }
          className="pointer-events-none absolute inset-0 rounded-xl border border-primary/15 bg-primary/10 shadow-[inset_0_1px_0_var(--glass-highlight)]"
        />
      )}
      <Icon
        aria-hidden="true"
        className={cn(
          "relative z-10 size-[1.125rem] shrink-0 transition-colors",
          active ? "text-primary" : "text-current",
        )}
      />
      <AnimatePresence initial={false} mode="wait">
        {collapsed ? (
          <span key="sr-label" className="sr-only">
            {label}
          </span>
        ) : (
          <motion.span
            key="visible-label"
            initial={reducedMotion ? false : { opacity: 0, x: -5, width: 0 }}
            animate={{ opacity: 1, x: 0, width: "auto" }}
            exit={{ opacity: 0, x: -4, width: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.16 }}
            className="relative z-10 min-w-0 flex-1 truncate text-left"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {!collapsed && badge !== undefined && badge !== null && (
        <span className="relative z-10 ml-auto rounded-full bg-[var(--glass-badge)] px-2 py-0.5 text-[0.68rem] font-semibold text-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function GlassSidebarFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-[var(--glass-border)] p-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface GlassSidebarToggleProps {
  collapsed?: boolean;
  onToggle?: () => void;
  controlsId?: string;
  className?: string;
}

export function GlassSidebarToggle({
  collapsed,
  onToggle,
  controlsId = "pdsw-dashboard-sidebar-navigation",
  className,
}: GlassSidebarToggleProps) {
  const context = useContext(GlassSidebarContext);
  const isCollapsed = collapsed ?? context?.collapsed ?? false;
  const handleToggle = onToggle ?? context?.toggle;

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!isCollapsed}
      aria-controls={controlsId}
      title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--glass-border)] text-muted-foreground",
        "transition-[background-color,color,transform] duration-200 hover:bg-[var(--glass-hover)] hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--glass-surface-solid)]",
        "motion-reduce:transition-none",
        className,
      )}
    >
      <ChevronLeft
        aria-hidden="true"
        className={cn(
          "size-4 transition-transform duration-300 motion-reduce:transition-none",
          isCollapsed && "rotate-180",
        )}
      />
    </button>
  );
}
