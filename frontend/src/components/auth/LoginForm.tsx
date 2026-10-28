"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { Role, User } from "@/types";
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
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  ChevronDown,
  X,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  Wallet,
} from "lucide-react";

interface LoginFormProps {
  initialRole?: Role;
}

/** Categorise backend/frontend errors into user-friendly messages */
function friendlyError(err: unknown): {
  message: string;
  canRetryChallenge: boolean;
} {
  const providerCode = (err as any)?.code;
  const msg = (err as any)?.message || "";
  const lower = msg.toLowerCase();

  if (msg.includes("METAMASK_NOT_INSTALLED") || lower.includes("not installed"))
    return {
      message:
        "MetaMask was not detected. Redirecting to the official download page…",
      canRetryChallenge: false,
    };

  // EIP-1193 uses code 4001 when the user rejects a wallet request. Do not
  // broadly match "denied": backend authorization errors legitimately use it.
  if (
    providerCode === 4001 ||
    msg.includes("4001") ||
    lower.includes("user rejected the request") ||
    lower.includes("user denied account authorization") ||
    lower.includes("user denied message signature")
  )
    return {
      message:
        "MetaMask request was cancelled. Click the button below to try again.",
      canRetryChallenge: true,
    };

  if (lower.includes("selected role") && lower.includes("does not match"))
    return {
      message:
        "The selected role does not match this account. Select your registered role and try again.",
      canRetryChallenge: false,
    };

  if (lower.includes("account is currently") && lower.includes("inactive"))
    return {
      message:
        "This account is inactive. Please contact an administrator to reactivate it.",
      canRetryChallenge: false,
    };

  // Challenge expired or not found — can retry WITHOUT going back to Step 1
  if (
    lower.includes("challenge expired") ||
    lower.includes("expired") ||
    lower.includes("nonce")
  )
    return {
      message:
        'The MetaMask challenge expired. Click "Get New Challenge" to request a fresh one — you do not need to sign in again.',
      canRetryChallenge: true,
    };

  if (lower.includes("not found") || lower.includes("challenge not found"))
    return {
      message:
        'Authentication challenge not found. Click "Get New Challenge" to request a fresh one.',
      canRetryChallenge: true,
    };

  if (
    lower.includes("network") ||
    lower.includes("chain") ||
    lower.includes("sepolia")
  )
    return {
      message:
        "Please switch MetaMask to Ethereum Sepolia (Chain ID: 11155111) and try again.",
      canRetryChallenge: true,
    };

  if (lower.includes("wallet") && lower.includes("mismatch"))
    return {
      message:
        "The connected wallet does not match the wallet registered for this account.",
      canRetryChallenge: false,
    };

  if (
    lower.includes("wallet") &&
    (lower.includes("associated") ||
      lower.includes("linked") ||
      lower.includes("ownership"))
  )
    return {
      message:
        "This wallet is already linked to another account. Use a different wallet or contact an administrator.",
      canRetryChallenge: false,
    };

  if (lower.includes("signer mismatch"))
    return {
      message:
        "Signature verification failed. Please ensure you are signing with the correct wallet.",
      canRetryChallenge: true,
    };

  return {
    message: msg || "Authentication failed. Please check your credentials.",
    canRetryChallenge: false,
  };
}

function getRoleDisplayLabel(role: Role): string {
  return ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;
}

function maskEmail(email?: string): string {
  if (!email || !email.includes("@")) return "Hidden for privacy";
  const [localPart, domain] = email.split("@");
  return `${localPart.slice(0, 2)}${localPart.length > 2 ? "***" : ""}@${domain}`;
}

/* ── SVG Role Icons ──────────────────────────────────────────────────── */
const RoleIcon = ({ role, size = 36 }: { role: string; size?: number }) => {
  const s = size;
  if (role === "BENEFICIARY")
    return (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient
            id="bg-ben"
            x1="0"
            y1="0"
            x2="48"
            y2="48"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fef3c7" />
            <stop offset="1" stopColor="#fde68a" />
          </linearGradient>
          <linearGradient
            id="card-ben"
            x1="6"
            y1="10"
            x2="42"
            y2="38"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#f59e0b" />
            <stop offset="1" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="22" fill="url(#bg-ben)" />
        <rect
          x="9"
          y="14"
          width="30"
          height="20"
          rx="3"
          fill="url(#card-ben)"
        />
        <rect x="9" y="14" width="30" height="7" rx="3" fill="#b45309" />
        <rect x="9" y="18" width="30" height="3" fill="#92400e" opacity="0.3" />
        <rect
          x="13"
          y="25"
          width="14"
          height="2"
          rx="1"
          fill="white"
          opacity="0.8"
        />
        <rect
          x="13"
          y="29"
          width="9"
          height="1.5"
          rx="0.75"
          fill="white"
          opacity="0.5"
        />
        <ellipse
          cx="38"
          cy="16"
          rx="2"
          ry="3.5"
          fill="#fbbf24"
          transform="rotate(-20 38 16)"
        />
        <ellipse
          cx="36"
          cy="18"
          rx="2"
          ry="3"
          fill="#fbbf24"
          transform="rotate(-40 36 18)"
        />
        <line
          x1="37"
          y1="20"
          x2="37"
          y2="23"
          stroke="#92400e"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <circle cx="30" cy="25" r="2.5" fill="white" opacity="0.9" />
        <path
          d="M26.5 33c0-2 1.6-3.5 3.5-3.5s3.5 1.5 3.5 3.5"
          fill="white"
          opacity="0.9"
        />
      </svg>
    );
  if (role === "PDS_OFFICER")
    return (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient
            id="bg-off"
            x1="0"
            y1="0"
            x2="48"
            y2="48"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#dbeafe" />
            <stop offset="1" stopColor="#bfdbfe" />
          </linearGradient>
          <linearGradient
            id="badge"
            x1="10"
            y1="8"
            x2="38"
            y2="40"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#3b82f6" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="22" fill="url(#bg-off)" />
        <path
          d="M24 7L36 12L36 24C36 31 30.5 36.5 24 39C17.5 36.5 12 31 12 24L12 12Z"
          fill="url(#badge)"
        />
        <path
          d="M24 11L33 15L33 24C33 29.5 29 34 24 36C19 34 15 29.5 15 24L15 15Z"
          fill="none"
          stroke="white"
          strokeWidth="1"
          opacity="0.4"
        />
        <line
          x1="24"
          y1="17"
          x2="24"
          y2="30"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="17"
          y1="19"
          x2="31"
          y2="19"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M17 19C16 21.5 15 23 15 23C16 24.5 19 24.5 20 23C20 23 19 21.5 17 19Z"
          fill="white"
          opacity="0.8"
        />
        <path
          d="M31 19C30 21.5 29 23 29 23C30 24.5 33 24.5 34 23C34 23 32 21.5 31 19Z"
          fill="white"
          opacity="0.8"
        />
        <polygon
          points="24,10 25,13 28,13 25.5,15 26.5,18 24,16 21.5,18 22.5,15 20,13 23,13"
          fill="#fbbf24"
        />
      </svg>
    );
  if (role === "ADMIN")
    return (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient
            id="bg-adm"
            x1="0"
            y1="0"
            x2="48"
            y2="48"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fee2e2" />
            <stop offset="1" stopColor="#fecaca" />
          </linearGradient>
          <linearGradient
            id="gear-fill"
            x1="8"
            y1="8"
            x2="40"
            y2="40"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#ef4444" />
            <stop offset="1" stopColor="#b91c1c" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="22" fill="url(#bg-adm)" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <rect
            key={a}
            x="21.5"
            y="5.5"
            width="5"
            height="7"
            rx="2"
            fill="url(#gear-fill)"
            transform={`rotate(${a} 24 24)`}
          />
        ))}
        <circle cx="24" cy="24" r="13" fill="url(#gear-fill)" />
        <circle cx="24" cy="24" r="6" fill="#fef2f2" />
        <path
          d="M18 28L20 22L23 25.5L24 21L25 25.5L28 22L30 28Z"
          fill="#ef4444"
        />
        <rect x="18" y="28" width="12" height="2.5" rx="1" fill="#ef4444" />
        <circle cx="21" cy="22.5" r="1" fill="#fbbf24" />
        <circle cx="24" cy="21.5" r="1" fill="#fbbf24" />
        <circle cx="27" cy="22.5" r="1" fill="#fbbf24" />
      </svg>
    );
  if (role === "SOC_ANALYST")
    return (
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient
            id="bg-soc"
            x1="0"
            y1="0"
            x2="48"
            y2="48"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#ede9fe" />
            <stop offset="1" stopColor="#ddd6fe" />
          </linearGradient>
          <linearGradient
            id="hex-fill"
            x1="8"
            y1="8"
            x2="40"
            y2="40"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#7c3aed" />
            <stop offset="1" stopColor="#4c1d95" />
          </linearGradient>
          <radialGradient id="iris" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6d28d9" />
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="22" fill="url(#bg-soc)" />
        <polygon
          points="24,7 37,14.5 37,29.5 24,37 11,29.5 11,14.5"
          fill="url(#hex-fill)"
        />
        <polygon
          points="24,11 33.5,16.5 33.5,27.5 24,33 14.5,27.5 14.5,16.5"
          fill="none"
          stroke="#a78bfa"
          strokeWidth="0.8"
          opacity="0.5"
        />
        <line
          x1="11"
          y1="22"
          x2="16"
          y2="22"
          stroke="#a78bfa"
          strokeWidth="1"
          opacity="0.7"
        />
        <line
          x1="32"
          y1="22"
          x2="37"
          y2="22"
          stroke="#a78bfa"
          strokeWidth="1"
          opacity="0.7"
        />
        <path
          d="M16 24C18 20 21.5 18.5 24 18.5C26.5 18.5 30 20 32 24C30 28 26.5 29.5 24 29.5C21.5 29.5 18 28 16 24Z"
          fill="white"
        />
        <circle cx="24" cy="24" r="4" fill="url(#iris)" />
        <circle cx="24" cy="24" r="2" fill="#1e1b4b" />
        <circle cx="25.2" cy="22.8" r="0.8" fill="white" opacity="0.9" />
        <circle cx="35" cy="13" r="3" fill="#f43f5e" />
        <circle cx="35" cy="13" r="1.5" fill="white" />
      </svg>
    );
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" fill="#f3f4f6" />
    </svg>
  );
};

/* ════════════════════════════════════════════════════════════════════════ */

export const LoginForm: React.FC<LoginFormProps> = ({ initialRole }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginStepOne, loginStepTwoWithMetaMask, isLoading } = useAuthStore();

  const registeredRole = searchParams?.get("role") || "";
  const defaultRole: Role = registeredRole
    ? normalizeRole(registeredRole)
    : initialRole
      ? normalizeRole(initialRole)
      : "BENEFICIARY";

  const [currentPhase, setCurrentPhase] = useState<"PHASE_1" | "PHASE_2">(
    "PHASE_1",
  );
  const [selectedRole, setSelectedRole] = useState<Role>(defaultRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const [tempToken, setTempToken] = useState("");
  const [verifiedUser, setVerifiedUser] = useState<User | null>(null);

  const [error, setError] = useState("");
  const [canRetryChallenge, setCanRetryChallenge] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [hasMetaMask, setHasMetaMask] = useState(true);
  const [phase2Submitting, setPhase2Submitting] = useState(false);

  // Double-click guard for Phase 2 — prevents concurrent MetaMask calls
  const phase2InFlight = useRef(false);
  const phase2Busy =
    phase2Submitting || (currentPhase === "PHASE_2" && isLoading);

  useEffect(() => {
    if (registeredRole) {
      setSelectedRole(normalizeRole(registeredRole));
      setEmail("");
      setPassword("");
    }
    if (typeof window !== "undefined") setHasMetaMask(isMetaMaskInstalled());
  }, [registeredRole]);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setEmail("");
    setPassword("");
    setError("");
    setCanRetryChallenge(false);
    setStatusMessage("");
    setShowRoleModal(false);
  };

  const goBackToPhaseOne = () => {
    phase2InFlight.current = false;
    setPhase2Submitting(false);
    setCurrentPhase("PHASE_1");
    setError("");
    setCanRetryChallenge(false);
    setStatusMessage("");
    // Keep email/role pre-filled for convenience, but clear the secure token
    setTempToken("");
    setVerifiedUser(null);
  };

  /* ── Phase 1 ─────────────────────────────────────────────────────── */
  const handlePhaseOneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCanRetryChallenge(false);
    setStatusMessage("Validating credentials…");
    try {
      const res = await loginStepOne(email, password, selectedRole);
      setTempToken(res.temp_token);
      setVerifiedUser(res.user);
      if (res.token) {
        // Rare: backend issued full token (should not happen per design, but handle safely)
        router.push(res.redirect_url || getRoleDashboard(selectedRole));
        return;
      }
      setStatusMessage("");
      setCurrentPhase("PHASE_2");
    } catch (err) {
      setStatusMessage("");
      const { message } = friendlyError(err);
      setError(message);
      setCanRetryChallenge(false);
      // Always stay on Phase 1 if Step 1 failed
      setCurrentPhase("PHASE_1");
    }
  };

  /* ── Phase 2 MetaMask sign ──────────────────────────────────────── */
  const handlePhaseTwoMetaMask = async () => {
    // Guard against double-click / concurrent calls
    if (phase2InFlight.current || phase2Submitting || isLoading) return;
    phase2InFlight.current = true;
    setPhase2Submitting(true);

    setError("");
    setCanRetryChallenge(false);
    setStatusMessage("");

    if (!isMetaMaskInstalled()) {
      setStatusMessage(
        "MetaMask not detected. Opening official download page…",
      );
      setTimeout(redirectToMetaMaskDownload, 1000);
      phase2InFlight.current = false;
      setPhase2Submitting(false);
      return;
    }

    if (!tempToken || !verifiedUser) {
      setError("Step 1 session expired. Please sign in again.");
      setCurrentPhase("PHASE_1");
      phase2InFlight.current = false;
      setPhase2Submitting(false);
      return;
    }

    try {
      setStatusMessage("Connecting to MetaMask on Sepolia…");
      const result = await loginStepTwoWithMetaMask(
        tempToken,
        verifiedUser,
        selectedRole,
      );
      setStatusMessage("Signature verified! Redirecting…");
      router.push(result.redirectUrl || getRoleDashboard(selectedRole));
    } catch (err) {
      setStatusMessage("");
      const { message, canRetryChallenge: canRetry } = friendlyError(err);
      setError(message);
      setCanRetryChallenge(canRetry);
    } finally {
      phase2InFlight.current = false;
      setPhase2Submitting(false);
    }
  };

  /* ── Phase 2 "Get New Challenge" — retry WITHOUT going back to Step 1 ── */
  const handleRetryChallenge = () => {
    if (phase2InFlight.current || phase2Submitting || isLoading) return;
    setError("");
    setCanRetryChallenge(false);
    setStatusMessage("");
    // Simply re-trigger MetaMask flow — a new nonce will be fetched from the server
    handlePhaseTwoMetaMask();
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <>
      <div
        className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{ backgroundColor: "#f4f7fb" }}
      >
        {/* Back to home */}
        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center justify-center w-9 h-9 rounded-full bg-white shadow-sm text-slate-500 hover:text-slate-800 hover:bg-sky-50 hover:shadow-md transition-all"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="w-full max-w-[400px] px-4 flex flex-col items-center gap-5">
          {/* Logo */}
          <div
            className="flex items-center justify-center rounded-full border border-slate-100 shadow-sm"
            style={{ width: 88, height: 88, backgroundColor: "#ffffff" }}
          >
            <img
              src="/logo.png"
              alt="PDSW"
              className="object-contain w-16 h-16"
            />
          </div>

          {/* Heading */}
          <div className="text-center">
            <h1
              className="login-display !text-[#0f2742] text-[28px] font-normal"
              style={{
                color: "#0f2742",
                opacity: 1,
                WebkitTextFillColor: "#0f2742",
                filter: "none",
                textShadow: "none",
              }}
            >
              Welcome Back
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Sign in to access your dashboard.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div
                className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                  currentPhase === "PHASE_1"
                    ? "bg-[#6c91bd] text-white"
                    : "bg-[#65b87a] text-white"
                }`}
              >
                {currentPhase === "PHASE_2" ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  "1"
                )}
              </div>
              <span
                className={`text-xs font-medium ${currentPhase === "PHASE_1" ? "text-gray-800" : "text-gray-400"}`}
              >
                Sign In
              </span>
            </div>
            <div className="h-px w-8 bg-gray-300" />
            <div className="flex items-center gap-1.5">
              <div
                className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                  currentPhase === "PHASE_2"
                    ? "bg-[#cf9362] text-white"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                2
              </div>
              <span
                className={`text-xs font-medium ${currentPhase === "PHASE_2" ? "text-gray-800" : "text-gray-400"}`}
              >
                MetaMask
              </span>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="w-full flex flex-col gap-2 p-3 rounded-xl bg-[#fff6f4] border border-[#f3d9d4]">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#c65a50] shrink-0 mt-0.5" />
                <p className="text-xs text-[#a34a43]">{error}</p>
              </div>
              {/* "Get New Challenge" button — only shown when the challenge can be retried */}
              {canRetryChallenge && currentPhase === "PHASE_2" && (
                <button
                  type="button"
                  onClick={handleRetryChallenge}
                  disabled={phase2Busy}
                  className="self-start ml-6 flex items-center gap-1.5 text-xs font-semibold text-[#b87342] hover:text-[#965d32] disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Get New Challenge
                </button>
              )}
            </div>
          )}

          {/* Status message */}
          {statusMessage && !error && (
            <div className="w-full flex items-start gap-2 p-3 rounded-xl bg-[#f1f7ff] border border-[#d7e6f8]">
              <Loader2 className="w-4 h-4 text-[#6388b5] shrink-0 mt-0.5 animate-spin" />
              <p className="text-xs text-[#4d729e]">{statusMessage}</p>
            </div>
          )}

          {/* ══ PHASE 1 ══ */}
          {currentPhase === "PHASE_1" && (
            <form
              onSubmit={handlePhaseOneSubmit}
              className="w-full flex flex-col gap-4"
            >
              {/* Role selector */}
              <button
                type="button"
                onClick={() => setShowRoleModal(true)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <RoleIcon role={selectedRole} size={24} />
                  <span className="text-sm font-medium text-gray-700">
                    {getRoleDisplayLabel(selectedRole)}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-300" />
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  Or continue with email
                </span>
                <div className="flex-1 h-px bg-gray-300" />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  placeholder="your@email.com"
                  autoComplete="email"
                  className="w-full bg-white border border-gray-200 rounded-full px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors shadow-sm"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full bg-white border border-gray-200 rounded-full px-4 py-2.5 pr-11 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors shadow-sm"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sign In button — disabled while loading to prevent double submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-full bg-[#6c91bd] hover:bg-[#587fae] text-white font-bold text-sm transition-all shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying…</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>

              {!hasMetaMask && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={redirectToMetaMaskDownload}
                    className="inline-flex items-center gap-1.5 text-xs text-[#E2761B] hover:underline"
                  >
                    <span>Need MetaMask? Install extension</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ══ PHASE 2 ══ */}
          {currentPhase === "PHASE_2" && verifiedUser && (
            <div className="w-full flex flex-col gap-3">
              {/* Step 1 verified card */}
              <div className="p-3 rounded-xl bg-[#f1faf4] border border-[#cce8d4] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[#4d9b62] font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Step 1 Verified</span>
                  </div>
                  <button
                    type="button"
                    onClick={goBackToPhaseOne}
                    className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
                  >
                    <ArrowLeft className="w-3 h-3" /> Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <div>
                    <span className="text-gray-400">Name:</span>{" "}
                    <span className="font-medium text-gray-700">
                      {verifiedUser.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Role:</span>{" "}
                    <span className="font-medium text-primary">
                      {getRoleDisplayLabel(selectedRole)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400">Email:</span>{" "}
                    <span className="font-medium text-gray-700">
                      {maskEmail(verifiedUser.email)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400">Wallet:</span>{" "}
                    <span className="font-mono text-gray-600 text-[10px]">
                      {verifiedUser.walletAddress
                        ? "Linked securely"
                        : "Not yet linked"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2 info */}
              <div className="p-3 rounded-xl bg-[#fff8ef] border border-[#f1d8b9] text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5 font-semibold text-gray-800 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#c78a57]" />
                  <span>Step 2: MetaMask Sepolia Verification</span>
                </div>
                <p>
                  Connect your wallet on Sepolia (Chain ID: 11155111) to
                  complete sign in.
                </p>
              </div>

              {/* MetaMask button — disabled while in-flight (double-click guard) */}
              <button
                type="button"
                onClick={handlePhaseTwoMetaMask}
                disabled={phase2Busy}
                aria-label="Connect and sign with MetaMask"
                className="w-full py-3 rounded-full bg-[#cf9362] hover:bg-[#b97d4c] text-white font-bold text-sm transition-all shadow-sm disabled:opacity-60 flex items-center justify-center gap-2.5"
              >
                {phase2Busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Waiting for MetaMask…</span>
                  </>
                ) : (
                  <>
                    <Wallet
                      className="w-5 h-5 shrink-0"
                      strokeWidth={2.4}
                      aria-hidden="true"
                    />
                    <span>Connect &amp; Sign with MetaMask</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={goBackToPhaseOne}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          )}

          <p className="text-[11px] text-gray-400">
            © 2026 PDS Welfare Platform
          </p>
        </div>
      </div>

      {/* ══ ROLE MODAL ══ */}
      {showRoleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowRoleModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Select Your Role
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Choose the role you are signing in as
                </p>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {ROLE_OPTIONS.map((opt) => {
                const isSelected = selectedRole === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleRoleSelect(opt.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white"
                    }`}
                  >
                    <RoleIcon role={opt.value} size={36} />
                    <div className="flex-1 min-w-0">
                      <span
                        className={`block text-sm font-semibold ${isSelected ? "text-primary" : "text-gray-800"}`}
                      >
                        {opt.label}
                      </span>
                      <span className="block text-[11px] text-gray-400 truncate mt-0.5">
                        {opt.description}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={() => setShowRoleModal(false)}
                className="w-full py-2.5 rounded-full bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all"
              >
                Confirm Role
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
