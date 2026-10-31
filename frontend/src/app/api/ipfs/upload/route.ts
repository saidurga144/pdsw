import { NextRequest, NextResponse } from "next/server";
import { verifyJwtToken } from "@/server/auth/jwt";
import { fetchPinataService } from "@/server/services/pinata-proxy";

/**
 * POST /api/ipfs/upload
 * Server-side proxy that forwards multipart file uploads to the Pinata microservice.
 * Enforces session authentication so anonymous users cannot consume IPFS quotas.
 */
export async function POST(req: NextRequest) {
  // Enforce authentication
  const authHeader = req.headers.get("authorization");
  const token =
    (authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null) || req.cookies.get("pds_token")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Authentication required to upload documents." },
      { status: 401 },
    );
  }

  const payload = verifyJwtToken(token);
  if (!payload || !payload.userId) {
    return NextResponse.json(
      { success: false, error: "Invalid or expired session token." },
      { status: 401 },
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    const body = await req.arrayBuffer();

    const pinataRes = await fetchPinataService("/api/ipfs/upload", {
      method: "POST",
      headers: {
        "content-type": contentType,
      },
      body: body,
    });

    const data = await pinataRes.json().catch(() => null);
    if (pinataRes.status === 404) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The Pinata upload endpoint returned 404. Confirm that PINATA_SERVICE_URL points to the deployed Pinata service, then redeploy that service.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json(data, { status: pinataRes.status });
  } catch (err: any) {
    console.error(
      "❌ [API /api/ipfs/upload] Pinata proxy error:",
      err?.message,
    );
    return NextResponse.json(
      {
        success: false,
        error:
          "IPFS upload service is unavailable. Check the Pinata service deployment and PINATA_SERVICE_URL configuration.",
      },
      { status: 503 },
    );
  }
}

/**
 * GET /api/ipfs/health
 * Proxies the Pinata service health check.
 */
export async function GET() {
  try {
    const pinataRes = await fetchPinataService("/api/ipfs/health", {
      method: "GET",
    });
    const data = await pinataRes.json().catch(() => null);
    if (pinataRes.status === 404) {
      return NextResponse.json(
        {
          status: "misconfigured",
          error:
            "The configured Pinata service does not expose /api/ipfs/health. Check PINATA_SERVICE_URL and the Render deployment.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json(data, { status: pinataRes.status });
  } catch {
    return NextResponse.json(
      { status: "unavailable", error: "Pinata service is not reachable." },
      { status: 503 },
    );
  }
}
