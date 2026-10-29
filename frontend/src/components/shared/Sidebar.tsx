"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { normalizeRole } from "@/lib/role-utils";
import {
  LayoutDashboard,
  UserCheck,
  Users,
  ShieldCheck,
  History,
  FileSpreadsheet,
  Settings,
  Cpu,
  Database,
  Lock,
  Eye,
  AlertTriangle,
  Send,
  Building2,
  FileCheck,
  LogOut,
  Home,
  Activity,
  ShieldAlert,
  X,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const router = useRouter();
  const { role, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const pathname = usePathname();

  if (!sidebarOpen) return null;

  const beneficiaryRoutes = [
    {
      href: "/beneficiary/dashboard",
      label: "My Dashboard",
      icon: LayoutDashboard,
    },
    { href: "/beneficiary/profile", label: "My Profile", icon: UserCheck },
    { href: "/beneficiary/family", label: "Family Management", icon: Users },
    {
      href: "/beneficiary/eligibility",
      label: "Ration Eligibility",
      icon: FileCheck,
    },
    { href: "/beneficiary/requests", label: "Change Requests", icon: Send },
    {
      href: "/beneficiary/transactions",
      label: "Distribution Receipts",
      icon: History,
    },
    {
      href: "/beneficiary/integrity",
      label: "Record Integrity (Citizen)",
      icon: ShieldCheck,
    },
    {
      href: "/beneficiary/settings",
      label: "Account Settings",
      icon: Settings,
    },
  ];

  const officerRoutes = [
    {
      href: "/officer/dashboard",
      label: "Officer Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/officer/beneficiaries",
      label: "Beneficiary Management",
      icon: Users,
    },
    {
      href: "/officer/verification",
      label: "Verification Queue",
      icon: FileCheck,
    },
    { href: "/officer/requests", label: "Modification Requests", icon: Send },
    {
      href: "/officer/distribution",
      label: "Commodity Release",
      icon: Building2,
    },
    {
      href: "/officer/migration",
      label: "Migration & Transfers",
      icon: Activity,
    },
    {
      href: "/officer/alerts",
      label: "Field Risk Alerts",
      icon: AlertTriangle,
    },
  ];

  const adminRoutes = [
    {
      href: "/admin/dashboard",
      label: "System Dashboard",
      icon: LayoutDashboard,
    },
    { href: "/admin/users", label: "User Directory", icon: Users },
    { href: "/admin/roles", label: "RBAC & Permissions", icon: Lock },
    {
      href: "/admin/ai-intelligence",
      label: "AI Risk Intelligence",
      icon: Cpu,
    },
    {
      href: "/admin/integrity",
      label: "Integrity Verification",
      icon: ShieldCheck,
    },
    { href: "/admin/ipfs", label: "IPFS Provenance Ledger", icon: Database },
    {
      href: "/admin/reports",
      label: "System Analytics",
      icon: FileSpreadsheet,
    },
    { href: "/admin/settings", label: "System Settings", icon: Settings },
  ];

  const socRoutes = [
    {
      href: "/soc/dashboard",
      label: "SOC Cyber Dashboard",
      icon: LayoutDashboard,
    },
    { href: "/soc/events", label: "Security Event Logs", icon: ShieldAlert },
    { href: "/soc/cyber-ai", label: "Cyber Anomaly Analytics", icon: Cpu },
  ];

  const canonicalRole = normalizeRole(role || "");
  let currentRoutes = beneficiaryRoutes;
  if (canonicalRole === "PDS_OFFICER") currentRoutes = officerRoutes;
  if (canonicalRole === "ADMIN") currentRoutes = adminRoutes;
  if (canonicalRole === "SOC_ANALYST") currentRoutes = socRoutes;

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      <div className="md:hidden fixed inset-0 z-50 flex">
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
        <aside className="relative w-72 max-w-[85vw] flex flex-col border-r border-border bg-white text-foreground shadow-xl z-10 h-full">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <span className="eyebrow text-[10px]">Portal Navigation</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-xs">
            {currentRoutes.map((route) => {
              const Icon = route.icon;
              const isActive =
                pathname === route.href ||
                pathname.startsWith(route.href + "/");
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => setSidebarOpen(false)}
                  className={clsx(
                    "flex items-center gap-2.5 rounded-md border-l-2 border-transparent px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "border-primary bg-primary/5 font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                  )}
                >
                  <Icon
                    className={clsx(
                      "w-4 h-4",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span className="sidebar-display">{route.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-border bg-background">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-all hover:border-destructive hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              <span className="sidebar-display">Sign Out</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-border bg-white text-foreground min-h-[calc(100vh-64px)]">
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-xs pt-4">
          <div className="eyebrow px-3 py-1.5 text-[9px]">
            Portal Navigation
          </div>
          {currentRoutes.map((route) => {
            const Icon = route.icon;
            const isActive =
              pathname === route.href || pathname.startsWith(route.href + "/");
            return (
              <Link
                key={route.href}
                href={route.href}
                className={clsx(
                  "flex items-center gap-2.5 rounded-md border-l-2 border-transparent px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary bg-primary/5 font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                <Icon
                  className={clsx(
                    "w-4 h-4",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="sidebar-display">{route.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border bg-background">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-all hover:border-destructive hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            <span className="sidebar-display">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
