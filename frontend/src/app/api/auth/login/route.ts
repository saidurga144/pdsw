import { NextRequest, NextResponse } from "next/server";
import { WalletAuthService } from "@/server/auth/wallet-auth";
import { signJwtToken } from "@/server/auth/jwt";
import { SocService } from "@/server/services/soc.service";
import { AuditService } from "@/server/services/audit.service";
import { getClientIp } from "@/server/middleware/auth.middleware";
import { getRoleDashboard, normalizeRole, parseRole } from "@/lib/role-utils";
import { Role } from "@/types";
import { DEFAULT_CHAIN_ID } from "@/lib/metamask";

const FASTAPI_URL = (
  process.env.FASTAPI_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:8002"
).replace("localhost", "127.0.0.1");

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || "unknown";
  const host = req.headers.get("host") || "localhost:3000";

  try {
    const body = await req.json();
    const {
      address,
      message,
      signature,
      email,
      password,
      role,
      selectedRole,
      chainId,
    } = body;
    const requestedRole = parseRole(selectedRole || role || "BENEFICIARY");
    if (!requestedRole) {
      return NextResponse.json(
        { success: false, error: "Select a supported account role." },
        { status: 400 },
      );
    }

    // =====================================================================
    // STEP 1: Email + Password → Proxy to FastAPI backend
    // Detected when: email and password are present (no wallet data)
    // =====================================================================
    if (email && password && !address) {
      try {
        const backendRes = await fetch(`${FASTAPI_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, role: requestedRole }),
        });

        const data = await backendRes.json();

        if (!backendRes.ok) {
          return NextResponse.json(
            {
              success: false,
              error: data.detail || data.error || "Invalid email or password.",
            },
            { status: backendRes.status },
          );
        }

        return NextResponse.json(data, { status: 200 });
      } catch (fetchErr: any) {
        console.error(
          "❌ [API /api/auth/login] FastAPI proxy error:",
          fetchErr?.message,
        );
        return NextResponse.json(
          {
            success: false,
            error: "Authentication service is unavailable. Please try again.",
          },
          { status: 503 },
        );
      }
    }

    // =====================================================================
    // STEP 2: MetaMask Wallet Signature Verification
    // Detected when: address, message, signature are all present
    // =====================================================================

    // Rate Limiting: 12 attempts / 5 mins per IP
    const { RateLimiter } =
      await import("@/server/middleware/rateLimit.middleware");
    const ipLimit = RateLimiter.checkRateLimit(`auth:ip:${ipAddress}`, {
      windowMs: 300000,
      maxRequests: 12,
    });

    if (!ipLimit.allowed) {
      const retryAfter = ipLimit.retryAfterSeconds || 60;
      await SocService.logSecurityEvent({
        eventType: "BRUTE_FORCE_ATTEMPT",
        severity: "HIGH",
        ipAddress,
        userAgent,
        endpoint: "/api/auth/login",
        details: {
          reason: "Rate limit exceeded on wallet authentication",
          retryAfterSeconds: retryAfter,
        },
      });

      const res = NextResponse.json(
        {
          success: false,
          error: `Too many authentication attempts. Please retry after ${retryAfter} seconds.`,
        },
        { status: 429 },
      );
      res.headers.set("Retry-After", String(retryAfter));
      return res;
    }

    if (!address || !message || !signature) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Wallet address, signed challenge message, and cryptographic signature are required.",
        },
        { status: 400 },
      );
    }

    // ── STEP 2a: Proxy to FastAPI verify-wallet if a Phase-1 temp_token is present ──
    // This is the primary path: Phase 1 (email+password) → Phase 2 (MetaMask wallet)
    // The temp_token carries the real user_id stored in MongoDB, so FastAPI can verify.
    const authorizationHeader = req.headers.get("authorization") || "";
    const tempToken = authorizationHeader.startsWith("Bearer ")
      ? authorizationHeader.substring(7)
      : "";

    if (!tempToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Intermediate authentication token is required. Please complete Step 1 database login first.",
        },
        { status: 401 },
      );
    }

    // Proxy wallet verification to FastAPI which verifies signature, nonce, and registered wallet in MongoDB/SQLite
    try {
      const fastapiVerifyRes = await fetch(
        `${FASTAPI_URL}/api/auth/verify-wallet`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tempToken}`,
          },
          body: JSON.stringify({
            wallet_address: address,
            message,
            signature,
            chain_id: chainId || DEFAULT_CHAIN_ID,
          }),
        },
      );

      const fastapiData = await fastapiVerifyRes.json().catch(() => ({}));

      if (fastapiVerifyRes.ok && fastapiData.token) {
        await SocService.logSecurityEvent({
          eventType: "AUTH_SUCCESS",
          severity: "LOW",
          ipAddress,
          userAgent,
          endpoint: "/api/auth/login",
          details: {
            authMethod: "METAMASK_SEPOLIA_VERIFIED",
            walletAddress: address,
          },
        });

        const userRole = normalizeRole(
          (fastapiData.user?.role || requestedRole) as Role,
        );
        const response = NextResponse.json({
          success: true,
          user: fastapiData.user,
          token: fastapiData.token,
          redirectUrl: fastapiData.redirect_url || getRoleDashboard(userRole),
        });

        // NOTE: httpOnly is intentionally false — auth.service.ts also writes these
        // cookies via document.cookie for middleware routing. Changing to httpOnly:true
        // here would conflict with the client-side cookie writes. The token is also
        // stored in localStorage for API calls. In production, add Secure:true.
        const isSecure = process.env.NODE_ENV === "production";
        response.cookies.set("pds_token", fastapiData.token, {
          path: "/",
          httpOnly: false,
          secure: isSecure,
          sameSite: "strict",
          maxAge: 60 * 60 * 8,
        });
        response.cookies.set("pds_role", userRole, {
          path: "/",
          httpOnly: false,
          secure: isSecure,
          sameSite: "strict",
          maxAge: 60 * 60 * 8,
        });

        return response;
      }

      // Backend rejected (e.g. wallet mismatch, wrong network, bad signature)
      const errDetail =
        fastapiData.detail ||
        fastapiData.error ||
        "Wallet verification failed.";
      return NextResponse.json(
        { success: false, error: errDetail },
        { status: fastapiVerifyRes.status || 401 },
      );
    } catch (proxyErr: any) {
      console.error(
        "❌ [MetaMask proxy → FastAPI verify-wallet] error:",
        proxyErr?.message,
      );
      return NextResponse.json(
        {
          success: false,
          error: "Authentication service is unavailable. Please try again.",
        },
        { status: 503 },
      );
    }
  } catch (error: any) {
    console.error("❌ [API /api/auth/login Error]", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed. Please try again." },
      { status: 500 },
    );
  }
}
