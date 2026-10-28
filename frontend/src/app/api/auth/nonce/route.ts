import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_CHAIN_ID } from "@/lib/metamask";

const FASTAPI_URL = (
  process.env.FASTAPI_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:8002"
).replace("localhost", "127.0.0.1");

/**
 * GET /api/auth/nonce?address=0x...
 *
 * Proxies to the Python FastAPI backend which stores the nonce
 * in its in-memory _NONCE_STORE. The nonce MUST come from the same
 * backend that will verify it — never generate locally here.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { success: false, error: "Ethereum wallet address is required." },
      { status: 400 },
    );
  }

  if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
    return NextResponse.json(
      { success: false, error: "Invalid Ethereum wallet address format." },
      { status: 400 },
    );
  }

  const authHeader = req.headers.get("authorization");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authHeader) headers["Authorization"] = authHeader;

  try {
    const backendRes = await fetch(
      `${FASTAPI_URL}/api/auth/nonce?address=${encodeURIComponent(address.toLowerCase())}`,
      {
        method: "GET",
        headers,
        // No cache — every nonce must be fresh
        cache: "no-store",
      },
    );

    const data = await backendRes.json().catch(() => ({
      success: false,
      error: "Invalid response from authentication backend.",
    }));

    if (!backendRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            data.detail || data.error || "Failed to obtain nonce from backend.",
        },
        { status: backendRes.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (fetchErr: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Authentication backend is unavailable. Please ensure the backend server is running and try again.",
      },
      { status: 503 },
    );
  }
}

/**
 * POST /api/auth/nonce — also proxies to backend for consistency
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address = body.address;

    if (!address || !/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      return NextResponse.json(
        { success: false, error: "Valid Ethereum wallet address is required." },
        { status: 400 },
      );
    }

    const authHeader = req.headers.get("authorization");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authHeader) headers["Authorization"] = authHeader;

    const backendRes = await fetch(
      `${FASTAPI_URL}/api/auth/nonce?address=${encodeURIComponent(address.toLowerCase())}`,
      { method: "GET", headers, cache: "no-store" },
    );

    const data = await backendRes.json().catch(() => ({
      success: false,
      error: "Invalid response from authentication backend.",
    }));

    return NextResponse.json(data, {
      status: backendRes.ok ? 200 : backendRes.status,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to generate authentication nonce.",
      },
      { status: 503 },
    );
  }
}
