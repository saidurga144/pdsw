import { User, Role } from '@/types';
import { apiClient } from './api/client';
import { normalizeRole } from '@/lib/role-utils';
import {
  isMetaMaskInstalled,
  redirectToMetaMaskDownload,
  requestMetaMaskAccounts,
  getCurrentChainId,
  ensureSupportedNetwork,
  createSiweMessage,
  signSiweMessage,
} from '@/lib/metamask';

export class AuthService {
  /**
   * Cryptographic Sign-In With Ethereum (SIWE / EIP-4361) using MetaMask wallet
   */
  static async loginWithMetaMask(
    role: Role
  ): Promise<{ user: User; token: string; redirectUrl: string }> {
    // 1. Detect MetaMask installation
    if (!isMetaMaskInstalled()) {
      redirectToMetaMaskDownload();
      throw new Error(
        'MetaMask is not installed. Redirecting to the official MetaMask installation page...'
      );
    }

    // 2. Request wallet account connection
    const address = await requestMetaMaskAccounts();

    // 3. Ensure supported blockchain network
    await ensureSupportedNetwork();
    const chainId = await getCurrentChainId();

    // 4. Fetch unique authentication nonce and challenge context from server
    const nonceRes = await apiClient.get(`/auth/nonce?address=${address}`);
    if (!nonceRes.data?.success || !nonceRes.data?.nonce) {
      throw new Error(nonceRes.data?.error || 'Failed to obtain authentication challenge from server.');
    }

    const { nonce, domain, uri, issuedAt, expiresAt } = nonceRes.data;

    // 5. Construct EIP-4361 SIWE challenge message
    const message = createSiweMessage({
      domain: domain || (typeof window !== 'undefined' ? window.location.hostname : 'localhost'),
      address,
      statement: 'Sign in to Public Distribution System Welfare (PDSW) Government Portal with your verified wallet.',
      uri: uri || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
      chainId,
      nonce,
      issuedAt,
      expirationTime: expiresAt,
    });

    // 6. Request cryptographic signature from MetaMask
    const signature = await signSiweMessage(message, address);

    // 7. Verify signature and authenticate on backend server
    const targetRole = normalizeRole(role);
    const res = await apiClient.post('/auth/login', {
      address,
      message,
      signature,
      role: targetRole,
      chainId,
    });

    if (!res.data?.success || !res.data?.user || !res.data?.token) {
      throw new Error(res.data?.error || 'Cryptographic wallet authentication failed on server.');
    }

    const { user, token, redirectUrl } = res.data;

    // 8. Establish client session
    if (typeof window !== 'undefined') {
      localStorage.setItem('pds_token', token);
      localStorage.setItem('pds_user', JSON.stringify(user));
      document.cookie = `pds_token=${token}; path=/; max-age=28800; SameSite=Lax`;
      document.cookie = `pds_role=${user.role}; path=/; max-age=28800; SameSite=Lax`;
    }

    return { user, token, redirectUrl };
  }

  /**
   * Registers a new user account with selected role.
   * Directs user to sign in using MetaMask with their selected role.
   */
  static async signup(_data: {
    email: string;
    password?: string;
    role: string;
    fullName: string;
    phone?: string;
    jurisdiction?: string;
  }): Promise<{ user: User; message: string }> {
    throw new Error('Public registration is disabled. Accounts must be provisioned by a PDS administrator.');
  }

  /**
   * Retrieves the currently authenticated user from API or localStorage
   */
  static async getCurrentUser(): Promise<User | null> {
    if (typeof window === 'undefined') return null;

    const token = localStorage.getItem('pds_token');
    if (!token) return null;

    try {
      const res = await apiClient.get('/auth/me');
      if (res.data?.success && res.data?.user) {
        localStorage.setItem('pds_user', JSON.stringify(res.data.user));
        return res.data.user;
      }
    } catch {
      // Fall back to cached user in localStorage
    }

    const userStr = localStorage.getItem('pds_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Logs out the current user, clears all session data, cookies, and storages
   */
  static async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('pds_token');
      localStorage.removeItem('pds_user');
      sessionStorage.clear();
      document.cookie = 'pds_token=; Max-Age=0; path=/';
      document.cookie = 'pds_role=; Max-Age=0; path=/';
    }
  }
}
