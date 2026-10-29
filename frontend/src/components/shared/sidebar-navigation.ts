import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Building2,
  Cpu,
  Database,
  FileCheck2,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  LockKeyhole,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Send,
  UserRound,
  Users,
} from "lucide-react";
import { parseRole, type CanonicalRole } from "@/lib/role-utils";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
}

export interface DashboardNavGroup {
  label: string;
  items: DashboardNavItem[];
}

const roleNavigation: Record<CanonicalRole, DashboardNavGroup[]> = {
  BENEFICIARY: [
    {
      label: "Overview",
      items: [
        { href: "/beneficiary/dashboard", label: "My Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "Services & Records",
      items: [
        { href: "/beneficiary/eligibility", label: "Ration Eligibility", icon: FileCheck2 },
        { href: "/beneficiary/family", label: "Family Management", icon: Users },
        { href: "/beneficiary/requests", label: "Change Requests", icon: Send },
        { href: "/beneficiary/transactions", label: "Distribution Receipts", icon: History },
        { href: "/beneficiary/integrity", label: "Record Integrity", icon: ShieldCheck },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/beneficiary/notifications", label: "Notifications", icon: Bell },
        { href: "/beneficiary/profile", label: "My Profile", icon: UserRound },
        { href: "/beneficiary/settings", label: "Account Settings", icon: Settings },
      ],
    },
  ],
  PDS_OFFICER: [
    {
      label: "Overview",
      items: [
        { href: "/officer/dashboard", label: "Officer Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "Operations",
      items: [
        { href: "/officer/beneficiaries", label: "Beneficiary Management", icon: Users },
        { href: "/officer/verification", label: "Verification Queue", icon: FileCheck2 },
        { href: "/officer/requests", label: "Modification Requests", icon: Send },
        { href: "/officer/distribution", label: "Commodity Release", icon: Building2 },
        { href: "/officer/migration", label: "Migration & Transfers", icon: Activity },
        { href: "/officer/alerts", label: "Field Risk Alerts", icon: ShieldAlert },
      ],
    },
  ],
  ADMIN: [
    {
      label: "Overview",
      items: [
        { href: "/admin/dashboard", label: "System Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "Administration",
      items: [
        { href: "/admin/users", label: "User Directory", icon: Users },
        { href: "/admin/roles", label: "RBAC & Permissions", icon: LockKeyhole },
        { href: "/admin/settings", label: "System Settings", icon: Settings },
      ],
    },
    {
      label: "Security & Records",
      items: [
        { href: "/admin/ai-intelligence", label: "AI Risk Intelligence", icon: Cpu },
        { href: "/admin/integrity", label: "Integrity Verification", icon: ShieldCheck },
        { href: "/admin/ipfs", label: "IPFS Provenance Ledger", icon: Database },
        { href: "/admin/reports", label: "System Analytics", icon: FileSpreadsheet },
      ],
    },
  ],
  SOC_ANALYST: [
    {
      label: "Overview",
      items: [
        { href: "/soc/dashboard", label: "SOC Cyber Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "Monitoring",
      items: [
        { href: "/soc/events", label: "Security Event Logs", icon: ShieldAlert },
        { href: "/soc/cyber-ai", label: "Cyber Anomaly Analytics", icon: Cpu },
      ],
    },
  ],
};

export function getDashboardNavGroups(role: string | null | undefined) {
  const canonicalRole = role ? parseRole(role) : null;
  return canonicalRole ? roleNavigation[canonicalRole] : [];
}

export function getDashboardNavState(pathname: string, href: string) {
  const current = pathname === href;
  return {
    current,
    active: current || pathname.startsWith(`${href}/`),
  };
}
