import { create } from 'zustand';
import { User, Role } from '@/types';
import { AuthService } from '@/services/auth.service';
import { hasPermission, Module, Action } from '@/lib/rbac';
import { getRoleDashboard, normalizeRole } from '@/lib/role-utils';

export type AuthStep = 'IDLE' | 'CONNECTING' | 'SIGNING' | 'VERIFYING' | 'AUTHENTICATED';

interface AuthState {
  user: User | null;
  role: Role;
  walletAddress: string | null;
  authStep: AuthStep;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  /** Sign in with MetaMask SIWE challenge and selected role */
  loginWithMetaMask: (role: Role) => Promise<{ redirectUrl: string }>;

  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
  setAuthStep: (step: AuthStep) => void;
  /** RBAC helper */
  hasPermission: (module: Module, action: Action) => boolean;
  /** Resolve dashboard path based on role */
  getDashboardPath: () => string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: 'BENEFICIARY',
  walletAddress: null,
  authStep: 'IDLE',
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  setAuthStep: (step: AuthStep) => set({ authStep: step }),

  initAuth: async () => {
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
        });
      } else {
        set({ user: null, walletAddress: null, isAuthenticated: false, isInitialized: true });
      }
    } catch {
      set({ user: null, walletAddress: null, isAuthenticated: false, isInitialized: true });
    } finally {
      set({ isLoading: false });
    }

    // Attach MetaMask Event Listeners in browser
    if (typeof window !== 'undefined' && window.ethereum?.on) {
      window.ethereum.on('accountsChanged', async (accounts: string[]) => {
        const currentUser = get().user;
        if (!accounts || accounts.length === 0) {
          // Disconnected
          await get().logout();
        } else if (currentUser && currentUser.walletAddress) {
          if (accounts[0].toLowerCase() !== currentUser.walletAddress.toLowerCase()) {
            console.log('🔄 MetaMask account changed. Invalidating previous session.');
            await get().logout();
          }
        }
      });

      window.ethereum.on('chainChanged', () => {
        // Chain changed - recommended to refresh or verify
      });

      window.ethereum.on('disconnect', async () => {
        await get().logout();
      });
    }
  },

  loginWithMetaMask: async (role: Role) => {
    set({ isLoading: true, authStep: 'CONNECTING' });
    try {
      set({ authStep: 'SIGNING' });
      const { user, redirectUrl } = await AuthService.loginWithMetaMask(role);
      set({
        user,
        role: normalizeRole(user.role),
        walletAddress: user.walletAddress || null,
        isAuthenticated: true,
        isInitialized: true,
        authStep: 'AUTHENTICATED',
      });
      return { redirectUrl };
    } catch (err) {
      set({ authStep: 'IDLE' });
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
        role: 'BENEFICIARY',
        walletAddress: null,
        isAuthenticated: false,
        authStep: 'IDLE',
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
