import { create } from "zustand";
import { User, Role } from "@/types";
import { AuthService } from "@/services/auth.service";
import { hasPermission, Module, Action } from "@/lib/rbac";
import { getRoleDashboard, normalizeRole } from "@/lib/role-utils";
import { StepOneResult } from "@/services/auth.service";

export type AuthStep =
  | "IDLE"
  | "STEP_ONE"
  | "METAMASK_PENDING"
  | "CONNECTING"
  | "SIGNING"
  | "VERIFYING"
  | "AUTHENTICATED";

interface AuthState {
  user: User | null;
  role: Role;
  walletAddress: string | null;
  authStep: AuthStep;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  /** Phase 1: Database Credentials Authentication */
  loginStepOne: (
    email: string,
    password: string,
    role: Role,
  ) => Promise<StepOneResult>;
  /** Phase 2: Cryptographic MetaMask Verification */
  loginStepTwoWithMetaMask: (
    tempToken: string,
    user: User,
    targetRole?: Role,
  ) => Promise<{ redirectUrl: string }>;
  /** Direct / Backward-compatible Sign in with MetaMask */
  loginWithMetaMask: (role: Role) => Promise<{ redirectUrl: string }>;

  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
  setAuthStep: (step: AuthStep) => void;
  hasPermission: (module: Module, action: Action) => boolean;
  getDashboardPath: () => string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: "BENEFICIARY",
  walletAddress: null,
  authStep: "IDLE",
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  loginStepOne: async (email: string, password: string, role: Role) => {
    set({ isLoading: true, authStep: "STEP_ONE", isAuthenticated: false });
    try {
      const result = await AuthService.loginStepOne(email, password, role);
      // Step 1 alone MUST NOT grant authenticated session
      set({
        user: null,
        isAuthenticated: false,
        authStep: "METAMASK_PENDING",
      });
      return result;
    } finally {
      set({ isLoading: false });
    }
  },

  loginStepTwoWithMetaMask: async (
    tempToken: string,
    user: User,
    targetRole?: Role,
  ) => {
    set({ isLoading: true, authStep: "CONNECTING" });
    try {
      set({ authStep: "SIGNING" });
      const { user: verifiedUser, redirectUrl } =
        await AuthService.loginStepTwoWithMetaMask(tempToken, user, targetRole);
      set({
        user: verifiedUser,
        role: normalizeRole(verifiedUser.role),
        walletAddress: verifiedUser.walletAddress || null,
        isAuthenticated: true,
        isInitialized: true,
        authStep: "AUTHENTICATED",
      });
      return { redirectUrl };
    } catch (err) {
      set({ authStep: "METAMASK_PENDING" });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  setAuthStep: (step: AuthStep) => set({ authStep: step }),

  initAuth: async () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("pds_token");
      if (!token) {
        set({
          user: null,
          walletAddress: null,
          isAuthenticated: false,
          isInitialized: true,
          authStep: "IDLE",
        });
        return;
      }
    }
    set({ isLoading: true });
    try {
      const user = await AuthService.getCurrentUser();
      if (user) {
        set({
          user,
          role: normalizeRole(user.role),
          walletAddress: user.walletAddress || null,
          isAuthenticated: true,
          isInitialized: true,
          authStep: "AUTHENTICATED",
        });
        if (typeof window !== "undefined") {
          localStorage.setItem("pds_user", JSON.stringify(user));
        }
      } else {
        set({
          user: null,
          walletAddress: null,
          isAuthenticated: false,
          isInitialized: true,
          authStep: "IDLE",
        });
        if (typeof window !== "undefined") {
          localStorage.removeItem("pds_token");
          localStorage.removeItem("pds_user");
        }
      }
    } catch {
      set({
        user: null,
        walletAddress: null,
        isAuthenticated: false,
        isInitialized: true,
        authStep: "IDLE",
      });
      if (typeof window !== "undefined") {
        localStorage.removeItem("pds_token");
        localStorage.removeItem("pds_user");
      }
    } finally {
      set({ isLoading: false });
    }

    // Attach MetaMask Event Listeners in browser
    if (typeof window !== "undefined" && window.ethereum?.on) {
      window.ethereum.on("accountsChanged", async (accounts: string[]) => {
        const currentUser = get().user;
        if (!accounts || accounts.length === 0) {
          // Disconnected
          await get().logout();
        } else if (currentUser && currentUser.walletAddress) {
          if (
            accounts[0].toLowerCase() !==
            currentUser.walletAddress.toLowerCase()
          ) {
            console.log(
              "🔄 MetaMask account changed. Invalidating previous session.",
            );
            await get().logout();
          }
        }
      });

      window.ethereum.on("chainChanged", () => {
        // Chain changed - recommended to refresh or verify
      });

      window.ethereum.on("disconnect", async () => {
        await get().logout();
      });
    }
  },

  loginWithMetaMask: async (role: Role) => {
    set({ isLoading: true, authStep: "CONNECTING" });
    try {
      set({ authStep: "SIGNING" });
      const { user, redirectUrl } = await AuthService.loginWithMetaMask(role);
      set({
        user,
        role: normalizeRole(user.role),
        walletAddress: user.walletAddress || null,
        isAuthenticated: true,
        isInitialized: true,
        authStep: "AUTHENTICATED",
      });
      return { redirectUrl };
    } catch (err) {
      set({ authStep: "IDLE" });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await AuthService.logout();
      set({
        user: null,
        role: "BENEFICIARY",
        walletAddress: null,
        isAuthenticated: false,
        authStep: "IDLE",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  hasPermission: (module: Module, action: Action) => {
    const { role } = get();
    return hasPermission(role, module, action);
  },

  getDashboardPath: () => {
    const { role } = get();
    return getRoleDashboard(role);
  },
}));
