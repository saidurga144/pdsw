import {
  getDashboardNavGroups,
  getDashboardNavState,
} from "./sidebar-navigation";
import type { CanonicalRole } from "@/lib/role-utils";

describe("dashboard sidebar navigation", () => {
  const roleRoutes: Array<[CanonicalRole, string, string[]]> = [
    ["BENEFICIARY", "/beneficiary/", [
      "/beneficiary/dashboard",
      "/beneficiary/eligibility",
      "/beneficiary/family",
      "/beneficiary/integrity",
      "/beneficiary/notifications",
      "/beneficiary/profile",
      "/beneficiary/requests",
      "/beneficiary/settings",
      "/beneficiary/transactions",
    ]],
    ["PDS_OFFICER", "/officer/", [
      "/officer/alerts",
      "/officer/beneficiaries",
      "/officer/dashboard",
      "/officer/distribution",
      "/officer/migration",
      "/officer/requests",
      "/officer/verification",
    ]],
    ["ADMIN", "/admin/", [
      "/admin/ai-intelligence",
      "/admin/dashboard",
      "/admin/integrity",
      "/admin/ipfs",
      "/admin/reports",
      "/admin/roles",
      "/admin/settings",
      "/admin/users",
    ]],
    ["SOC_ANALYST", "/soc/", [
      "/soc/cyber-ai",
      "/soc/dashboard",
      "/soc/events",
    ]],
  ];

  it.each(roleRoutes)("only lists existing %s routes", (role, prefix, expected) => {
    const groups = getDashboardNavGroups(role);
    const paths = groups.flatMap((group) => group.items.map((item) => item.href));

    expect(groups.length).toBeGreaterThan(0);
    expect(paths.length).toBeGreaterThan(0);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((path) => path.startsWith(prefix))).toBe(true);
    expect(paths.sort()).toEqual(expected);
  });

  it("does not offer a default role menu for an unknown role", () => {
    expect(getDashboardNavGroups("UNKNOWN_ROLE")).toEqual([]);
    expect(getDashboardNavGroups(null)).toEqual([]);
  });

  it("marks exact and nested routes active without claiming a nested route is current", () => {
    expect(getDashboardNavState("/admin/users", "/admin/users")).toEqual({
      active: true,
      current: true,
    });
    expect(getDashboardNavState("/admin/users/123", "/admin/users")).toEqual({
      active: true,
      current: false,
    });
    expect(getDashboardNavState("/admin/reports", "/admin/users")).toEqual({
      active: false,
      current: false,
    });
  });
});
