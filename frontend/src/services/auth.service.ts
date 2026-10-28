import axios from "axios";
import { User, Role } from "@/types";
import { apiClient } from "./api/client";
import { normalizeRole, getRoleDashboard } from "@/lib/role-utils";
import {
  isMetaMaskInstalled,
  redirectToMetaMaskDownload,
  requestMetaMaskAccounts,
  getCurrentChainId,
  ensureSupportedNetwork,
  createSiweMessage,
  signSiweMessage,
  DEFAULT_CHAIN_ID,
} from "@/lib/metamask";

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8002"
).replace("localhost", "127.0.0.1");

export interface StepOneResult {
  success: boolean;
  requires_metamask: boolean;
  temp_token: string;
  token?: string;
  redirect_url?: string;
  user: User;
  message?: string;
}

export class AuthService {
  /**
   * Phase 1: Validates user credentials (email, password, role) against database
   */
  static async loginStepOne(
    email: string,
    password: string,
    role: Role,
  ): Promise<StepOneResult> {
    const canonicalRole = normalizeRole(role);

    try {
      // Primary: Call FastAPI backend directly
      const res = await axios.post(
        `${BACKEND_URL}/api/auth/login`,
        {
          email,
          password,
          role: canonicalRole,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        },
      );

      if (res.data?.success) {
        // Step 1 alone MUST NOT grant session tokens or cookies!
        return {
          success: true,
          requires_metamask: true,
          temp_token: res.data.temp_token,
          token: undefined,
          redirect_url: undefined,
          user: res.data.user,
          message: res.data.message,
        };
      }
      throw new Error(
        res.data?.error || "Database credential verification failed.",
      );
    } catch (err: any) {
      // If backend returned an HTTP error (4xx/5xx), surface it directly — do NOT retry
      if (err.response) {
        throw new Error(
          err.response.data?.detail ||
            err.response.data?.error ||
            `Authentication failed (HTTP ${err.response.status}).`,
        );
      }

      // Only fall back to Next.js proxy on network/connectivity errors (no response at all)
      try {
        const fallbackRes = await apiClient.post("/auth/login", {
          email,
          password,
          role: canonicalRole,
        });
        if (fallbackRes.data?.success) {
          return {
            success: true,
            requires_metamask: true,
            temp_token: fallbackRes.data.temp_token,
            token: undefined,
            redirect_url: undefined,
            user: fallbackRes.data.user,
          };
        }
        throw new Error(
          fallbackRes.data?.error ||
            fallbackRes.data?.detail ||
            "Credential verification failed.",
        );
      } catch (fallbackErr: any) {
        throw new Error(
          fallbackErr.response?.data?.detail ||
            fallbackErr.response?.data?.error ||
            fallbackErr.message ||
            "Failed to verify credentials against database.",
        );
      }
    }
  }

  /**
   * Phase 2: Connects MetaMask wallet on Sepolia, verifies 1-to-1 ownership, and cryptographically signs challenge
   */
  static async loginStepTwoWithMetaMask(
    tempToken: string,
    user: User,
    targetRole?: Role,
  ): Promise<{ user: User; token: string; redirectUrl: string }> {
    if (!isMetaMaskInstalled()) {
      redirectToMetaMaskDownload();
      throw new Error("MetaMask is required to complete authentication.");
    }

    // 1. Request wallet account connection
    const address = await requestMetaMaskAccounts();

    // 2. Ensure connected to Ethereum Sepolia Testnet (Chain ID 11155111)
    await ensureSupportedNetwork(11155111);
    const chainId = await getCurrentChainId();
    if (chainId !== 11155111) {
      throw new Error("Please switch MetaMask to the Sepolia network.");
    }

    // 3. Request cryptographic challenge nonce from backend
    let nonceData: any = null;
    try {
      // Pass lowercased address — Python backend stores nonces keyed by lowercase address
      const lowerAddress = address.toLowerCase();
      const nonceRes = await axios.get(
        `${BACKEND_URL}/api/auth/nonce?address=${lowerAddress}`,
        {
          headers: { Authorization: `Bearer ${tempToken}` },
          timeout: 10000,
        },
      );
      nonceData = nonceRes.data;
    } catch (nonceErr: any) {
      // Only fall back via Next.js on network errors — not on HTTP errors
      if (nonceErr.response) {
        throw new Error(
          nonceErr.response.data?.detail ||
            nonceErr.response.data?.error ||
            `Failed to get authentication challenge (HTTP ${nonceErr.response.status}).`,
        );
      }
      // Network unreachable — try Next.js proxy which also hits Python backend
      const lowerAddress = address.toLowerCase();
      const fallbackNonce = await axios.get(
        `/api/auth/nonce?address=${lowerAddress}`,
        {
          headers: { Authorization: `Bearer ${tempToken}` },
          timeout: 10000,
        },
      );
      nonceData = fallbackNonce.data;
    }

    if (!nonceData?.success || !nonceData?.nonce) {
      throw new Error(
        nonceData?.error ||
          nonceData?.detail ||
          "Failed to obtain authentication challenge from server.",
      );
    }

    const { nonce, domain, uri, issuedAt, expiresAt } = nonceData;

    // 4. Construct EIP-4361 SIWE challenge message
    // Use lowercase address consistently — Python backend keys nonce by lowercase address
    const message = createSiweMessage({
      domain:
        domain ||
        (typeof window !== "undefined"
          ? window.location.hostname
          : "localhost"),
      address: address.toLowerCase(),
      statement:
        "Sign in to Public Distribution System Welfare (PDSW) Government Portal with your verified wallet.",
      uri:
        uri ||
        (typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost:3000"),
      chainId: chainId || 11155111,
      nonce,
      issuedAt,
      expirationTime: expiresAt,
    });

    // 5. Request cryptographic signature from MetaMask
    // Sign with the original mixed-case address (MetaMask requirement)
    const signature = await signSiweMessage(message, address);

    // 6. Verify signature and establish session on backend
    let authResult: any = null;
    const lowerAddress = address.toLowerCase();
    try {
      const verifyRes = await axios.post(
        `${BACKEND_URL}/api/auth/verify-wallet`,
        {
          wallet_address: lowerAddress,
          message,
          signature,
          chain_id: chainId || 11155111,
        },
        {
          headers: { Authorization: `Bearer ${tempToken}` },
          timeout: 10000,
        },
      );
      authResult = verifyRes.data;
    } catch (verifyErr: any) {
      const errDetail =
        verifyErr.response?.data?.detail || verifyErr.response?.data?.error;
      if (errDetail) {
        throw new Error(errDetail);
      }
      // Fallback via Next.js
      try {
        const fallbackVerify = await axios.post(
          "/api/auth/login",
          {
            address,
            message,
            signature,
            role: targetRole || user.role,
            chainId,
          },
          {
            headers: { Authorization: `Bearer ${tempToken}` },
          },
        );
        authResult = fallbackVerify.data;
      } catch (fbErr: any) {
        const fbDetail =
          fbErr.response?.data?.detail ||
          fbErr.response?.data?.error ||
          fbErr.message;
        throw new Error(
          fbDetail || "Cryptographic wallet authentication failed.",
        );
      }
    }

    if (!authResult?.success || !authResult?.token) {
      throw new Error(
        authResult?.error ||
          authResult?.detail ||
          "Cryptographic wallet authentication failed.",
      );
    }

    const { token, redirect_url, redirectUrl, user: verifiedUser } = authResult;
    const resolvedUser = verifiedUser || user;
    const finalRedirectUrl =
      redirect_url ||
      redirectUrl ||
      getRoleDashboard(resolvedUser.role as Role);

    // 7. Establish persistent client session
    if (typeof window !== "undefined") {
      localStorage.setItem("pds_token", token);
      localStorage.setItem("pds_user", JSON.stringify(resolvedUser));
      // SameSite=Strict prevents CSRF; Secure is added automatically by browsers on HTTPS
      const secureFlag =
        window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `pds_token=${token}; path=/; max-age=28800; SameSite=Strict${secureFlag}`;
      document.cookie = `pds_role=${resolvedUser.role}; path=/; max-age=28800; SameSite=Strict${secureFlag}`;
    }

    return {
      user: resolvedUser,
      token,
      redirectUrl: finalRedirectUrl,
    };
  }

  /**
   * Direct one-step MetaMask login is disabled.
   */
  static async loginWithMetaMask(
    _role: Role,
  ): Promise<{ user: User; token: string; redirectUrl: string }> {
    throw new Error(
      "Two-step authentication is mandatory. Please enter database credentials first.",
    );
  }

  /**
   * Registers a new user account with role.
   * Enforces global unique email check at the database level.
   */
  static async signup(_data: {
    email: string;
    password?: string;
    role: string;
    fullName: string;
    phone?: string;
    jurisdiction?: string;
  }): Promise<{ user: User; message: string }> {
    throw new Error(
      "Public registration is disabled. Accounts must be provisioned by a PDS administrator.",
    );
  }

  static async getCurrentUser(): Promise<User | null> {
    if (typeof window === "undefined") return null;

    const token = localStorage.getItem("pds_token");
    if (!token) return null;

    try {
      const res = await axios.get(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      if (res.data?.success && res.data?.user) {
        localStorage.setItem("pds_user", JSON.stringify(res.data.user));
        return res.data.user;
      }
    } catch {
      // Fallback to local storage
    }

    const userStr = localStorage.getItem("pds_user");
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  static async logout(): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem("pds_token");
      localStorage.removeItem("pds_user");
      sessionStorage.clear();
      document.cookie = "pds_token=; Max-Age=0; path=/";
      document.cookie = "pds_role=; Max-Age=0; path=/";
    }
  }
}
