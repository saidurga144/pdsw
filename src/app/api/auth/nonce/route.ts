import { NextRequest, NextResponse } from "next/server";
import { WalletAuthService } from "@/server/auth/wallet-auth";
import { getClientIp } from "@/server/middleware/ip";
import { DEFAULT_CHAIN_ID } from "@/lib/metamask";
import { RateLimiter } from "@/server/middleware/rateLimit.middleware";

const ETH_ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

function validateAddress(address: string | null): NextResponse | null {
  if (!address || address.length > 42 || !ETH_ADDR_RE.test(address)) {
    return NextResponse.json(
      { success: false, error: "Invalid Ethereum wallet address format." },
      { status: 400 },
    );
  }
  return null;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = RateLimiter.checkRateLimit(`nonce:${ip}`, {
    windowMs: 300_000,
    maxRequests: 20,
  });
  if (!limit.allowed) {
    const res = NextResponse.json(
      { success: false, error: "Too many nonce requests. Please retry later." },
      { status: 429 },
    );
    res.headers.set("Retry-After", String(limit.retryAfterSeconds || 60));
    return res;
  }

  const { searchParams } = req.nextUrl;
  const address = searchParams.get("address");
  const addrError = validateAddress(address);
  if (addrError) return addrError;

  const host = req.headers.get("host") || "localhost:3000";
  const domain = host.split(":")[0];
  const { nonce, issuedAt, expiresAt } =
    WalletAuthService.generateNonce(address!);

  return NextResponse.json({
    success: true,
    nonce,
    domain,
    uri: `${req.nextUrl.protocol}//${host}`,
    chainId: DEFAULT_CHAIN_ID,
    issuedAt,
    expiresAt,
  });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = RateLimiter.checkRateLimit(`nonce:${ip}`, {
    windowMs: 300_000,
    maxRequests: 20,
  });
  if (!limit.allowed) {
    const res = NextResponse.json(
      { success: false, error: "Too many nonce requests. Please retry later." },
      { status: 429 },
    );
    res.headers.set("Retry-After", String(limit.retryAfterSeconds || 60));
    return res;
  }

  try {
    const body = await req.json();
    const address = body.address;
    const addrError = validateAddress(address);
    if (addrError) return addrError;

    const host = req.headers.get("host") || "localhost:3000";
    const domain = host.split(":")[0];
    const { nonce, issuedAt, expiresAt } =
      WalletAuthService.generateNonce(address);

    return NextResponse.json({
      success: true,
      nonce,
      domain,
      uri: `${req.nextUrl.protocol}//${host}`,
      chainId: DEFAULT_CHAIN_ID,
      issuedAt,
      expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate authentication nonce.",
      },
      { status: 500 },
    );
  }
}
