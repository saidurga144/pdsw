import { normalizeRole, getRoleDashboard } from "../lib/role-utils";
import { hasPermission, Module, Action } from "../lib/rbac";
import { useAuthStore } from "./auth.store";

describe("PDSW Authentication & Role Security Store", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      role: "BENEFICIARY",
      walletAddress: null,
      authStep: "IDLE",
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
    });
  });

  describe("Role Normalization & Canonicalization", () => {
    it("should normalize legacy and alternative role identifiers to canonical roles", () => {
      expect(normalizeRole("OFFICER")).toBe("PDS_OFFICER");
      expect(normalizeRole("pds_officer")).toBe("PDS_OFFICER");
      expect(normalizeRole("ADMINISTRATOR")).toBe("ADMIN");
      expect(normalizeRole("admin")).toBe("ADMIN");
      expect(normalizeRole("SOC")).toBe("SOC_ANALYST");
      expect(normalizeRole("SECURITY_ANALYST")).toBe("SOC_ANALYST");
      expect(normalizeRole("BENEFICIARY")).toBe("BENEFICIARY");
      expect(normalizeRole("unknown_role")).toBe("BENEFICIARY");
    });

    it("should resolve correct role dashboard paths", () => {
      expect(getRoleDashboard("ADMIN")).toBe("/admin/dashboard");
      expect(getRoleDashboard("PDS_OFFICER")).toBe("/officer/dashboard");
      expect(getRoleDashboard("SOC_ANALYST")).toBe("/soc/dashboard");
      expect(getRoleDashboard("BENEFICIARY")).toBe("/beneficiary/dashboard");
    });
  });

  describe("Role-Based Access Control (RBAC) Permissions", () => {
    it("should grant administrator full access across all modules", () => {
      expect(hasPermission("ADMIN", Module.USERS, Action.CREATE)).toBe(true);
      expect(hasPermission("ADMIN", Module.AUDIT, Action.VIEW)).toBe(true);
      expect(hasPermission("ADMIN", Module.SECURITY, Action.VIEW)).toBe(true);
    });

    it("should restrict beneficiary from administrative and officer operations", () => {
      expect(hasPermission("BENEFICIARY", Module.USERS, Action.CREATE)).toBe(false);
      expect(hasPermission("BENEFICIARY", Module.SECURITY, Action.CREATE)).toBe(false);
      expect(hasPermission("BENEFICIARY", Module.DISTRIBUTION, Action.CREATE)).toBe(false);
    });

    it("should allow PDS Officer to manage distribution and view beneficiaries", () => {
      expect(hasPermission("PDS_OFFICER", Module.DISTRIBUTION, Action.CREATE)).toBe(true);
      expect(hasPermission("PDS_OFFICER", Module.BENEFICIARY, Action.MODIFY)).toBe(true);
      expect(hasPermission("PDS_OFFICER", Module.SECURITY, Action.CREATE)).toBe(false);
    });
  });

  describe("Auth Store Initial State & State Transitions", () => {
    it("should initialize in unauthenticated state with no user identity", () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.walletAddress).toBeNull();
      expect(state.authStep).toBe("IDLE");
    });

    it("should update authStep correctly", () => {
      useAuthStore.getState().setAuthStep("METAMASK_PENDING");
      expect(useAuthStore.getState().authStep).toBe("METAMASK_PENDING");
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
