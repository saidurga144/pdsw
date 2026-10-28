"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { Role } from "@/types";
import {
  ROLE_OPTIONS,
  normalizeRole,
  getRoleDashboard,
} from "@/lib/role-utils";
import {
  isMetaMaskInstalled,
  redirectToMetaMaskDownload,
} from "@/lib/metamask";
import {
  Shield,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  ExternalLink,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface LoginFormProps {
  initialRole?: Role;
}

function friendlyError(err: unknown): string {
  const msg = (err as any)?.message || "";
  if (
    msg.includes("METAMASK_NOT_INSTALLED") ||
    msg.toLowerCase().includes("not installed")
  ) {
    return "MetaMask wallet was not detected in your browser. Redirecting to official download...";
  }
  if (
    msg.toLowerCase().includes("rejected") ||
    msg.toLowerCase().includes("denied") ||
    msg.includes("4001")
  ) {
    return "Wallet connection or signature request was cancelled in MetaMask.";
  }
  if (
    msg.toLowerCase().includes("nonce") ||
    msg.toLowerCase().includes("expired")
  ) {
    return "Authentication challenge expired or invalid. Please try signing in again.";
  }
  if (
    msg.toLowerCase().includes("network") ||
    msg.toLowerCase().includes("chain")
  ) {
    return "Please ensure MetaMask is connected to a supported blockchain network.";
  }
  return (
    msg ||
    "Authentication failed. Please verify your MetaMask connection and try again."
  );
}

export const LoginForm: React.FC<LoginFormProps> = ({ initialRole }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithMetaMask, isLoading } = useAuthStore();

  const registeredRole = searchParams?.get("role") || "";

  const defaultRole = registeredRole
    ? normalizeRole(registeredRole)
    : initialRole
      ? normalizeRole(initialRole)
      : "BENEFICIARY";

  const [selectedRole, setSelectedRole] = useState<Role>(defaultRole);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [hasMetaMask, setHasMetaMask] = useState(true);

  useEffect(() => {
    if (registeredRole) setSelectedRole(normalizeRole(registeredRole));
    if (typeof window !== "undefined") {
      setHasMetaMask(isMetaMaskInstalled());
    }
  }, [registeredRole]);

  const handleMetaMaskLogin = async () => {
    setError("");
    setStatusMessage("");

    if (!isMetaMaskInstalled()) {
      setStatusMessage(
        "MetaMask not detected. Opening official MetaMask installation page...",
      );
      setTimeout(() => {
        redirectToMetaMaskDownload();
      }, 1000);
      return;
    }

    try {
      setStatusMessage("1/3 Connecting to MetaMask wallet...");
      // Start flow
      const result = await loginWithMetaMask(selectedRole);
      setStatusMessage("Authentication successful! Navigating to dashboard...");
      router.push(result.redirectUrl || getRoleDashboard(selectedRole));
    } catch (err: unknown) {
      setStatusMessage("");
      setError(friendlyError(err));
    }
  };

  return (
    <div className="space-y-5">
      {/* Error Message Banner */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-md border border-destructive/30 bg-destructive/10 animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive font-medium">{error}</p>
        </div>
      )}

      {/* Live Status Message Banner */}
      {statusMessage && !error && (
        <div className="flex items-start gap-2.5 p-3 rounded-md border border-primary/30 bg-primary/10 animate-in fade-in slide-in-from-top-1 duration-200">
          <Loader2 className="size-4 text-primary shrink-0 mt-0.5 animate-spin" />
          <p className="text-xs text-primary font-medium">{statusMessage}</p>
        </div>
      )}

      {/* Role Selection Dropdown */}
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1.5">
            Target Portal Role <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <UserCheck className="size-4 text-muted-foreground absolute left-3.5 top-3" />
            <select
              id="login-role"
              required
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value as Role);
                setError("");
              }}
              disabled={isLoading}
              className="w-full bg-background border border-border rounded-md pl-10 pr-3 py-2.5 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Select the designated administration or citizen portal role.
          </p>
        </div>

        {/* Security Notice Card */}
        <div className="p-3 bg-secondary/40 border border-border rounded-md text-xs text-muted-foreground space-y-1.5">
          <div className="flex items-center gap-1.5 text-foreground font-semibold text-[11px]">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Cryptographic EIP-4361 Authentication</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Authentication is verified through cryptographic challenge
            signature. The portal will never request your private keys, seed
            phrases, or passwords.
          </p>
        </div>

        {/* Prominent Login with MetaMask Button */}
        <button
          id="login-metamask-btn"
          type="button"
          onClick={handleMetaMaskLogin}
          disabled={isLoading}
          className="w-full py-3 bg-[#E2761B] hover:bg-[#cd6613] active:scale-[0.99] disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-md flex items-center justify-center gap-2.5"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Authenticating Wallet...</span>
            </>
          ) : (
            <>
              {/* MetaMask Fox SVG Icon */}
              <svg className="size-5 shrink-0" viewBox="0 0 32 32" fill="none">
                <path
                  d="M29.5 3L18.2 11.4l2.1-4.9L29.5 3z"
                  fill="#E17726"
                  stroke="#E17726"
                  strokeWidth="0.25"
                />
                <path
                  d="M2.5 3l11.2 8.5-2-4.9L2.5 3z"
                  fill="#E27625"
                  stroke="#E27625"
                  strokeWidth="0.25"
                />
                <path
                  d="M25.3 22.8l-3 4.4 6.4 1.8 1.8-6.1-5.2-.1z"
                  fill="#E27625"
                  stroke="#E27625"
                  strokeWidth="0.25"
                />
                <path
                  d="M1.5 22.9l1.8 6.1 6.4-1.8-3-4.4-5.2.1z"
                  fill="#E27625"
                  stroke="#E27625"
                  strokeWidth="0.25"
                />
                <path
                  d="M9.4 14.1l-1.8 2.7 6.4.3-.2-7-4.4 4z"
                  fill="#E27625"
                  stroke="#E27625"
                  strokeWidth="0.25"
                />
                <path
                  d="M22.6 14.1l4.4-4-.2 7 6.4-.3-1.8-2.7z"
                  fill="#E27625"
                  stroke="#E27625"
                  strokeWidth="0.25"
                />
                <path
                  d="M9.7 27.2l3.8-1.9-3.3-2.6-.5 4.5z"
                  fill="#F5841F"
                  stroke="#F5841F"
                  strokeWidth="0.25"
                />
                <path
                  d="M22.3 27.2l-.5-4.5-3.3 2.6 3.8 1.9z"
                  fill="#F5841F"
                  stroke="#F5841F"
                  strokeWidth="0.25"
                />
                <path
                  d="M22.3 22.7l-3.8-3.7-2.5 7.6 6.3-3.9z"
                  fill="#C0AD9E"
                  stroke="#C0AD9E"
                  strokeWidth="0.25"
                />
                <path
                  d="M9.7 22.7l6.3 3.9-2.5-7.6-3.8 3.7z"
                  fill="#C0AD9E"
                  stroke="#C0AD9E"
                  strokeWidth="0.25"
                />
                <path
                  d="M13.5 19l-3.8-3.7-.3 3.9 4.1-.2z"
                  fill="#161616"
                  stroke="#161616"
                  strokeWidth="0.25"
                />
                <path
                  d="M18.5 19l4.1.2-.3-3.9-3.8 3.7z"
                  fill="#161616"
                  stroke="#161616"
                  strokeWidth="0.25"
                />
                <path
                  d="M16 21.6l-2.4-2.4H10l4.2 4.1L16 21.6z"
                  fill="#763D16"
                  stroke="#763D16"
                  strokeWidth="0.25"
                />
                <path
                  d="M16 21.6l1.8 1.7 4.2-4.1h-3.6l-2.4 2.4z"
                  fill="#763D16"
                  stroke="#763D16"
                  strokeWidth="0.25"
                />
              </svg>
              <span>Login with MetaMask</span>
              <ArrowRight className="size-4 ml-0.5" />
            </>
          )}
        </button>

        {/* MetaMask Installation Helper link if not detected */}
        {!hasMetaMask && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={redirectToMetaMaskDownload}
              className="inline-flex items-center gap-1.5 text-xs text-[#E2761B] hover:underline font-medium"
            >
              <span>Need MetaMask? Install official extension</span>
              <ExternalLink className="size-3" />
            </button>
          </div>
        )}
      </div>

      {/* Footer Details */}
      <div className="pt-4 border-t border-border text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Shield className="size-3.5 text-primary" />
        <span>PDSW Multi-Role Cryptographic Portal</span>
      </div>
    </div>
  );
};
