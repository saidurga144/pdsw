import { NextResponse } from "next/server";
import { fetchPinataService } from "@/server/services/pinata-proxy";

export async function GET() {
  try {
    const pinataRes = await fetchPinataService("/api/ipfs/health", {
      cache: "no-store",
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
      {
        status: "unavailable",
        error:
          "Pinata service is unreachable. Check the Render deployment and PINATA_SERVICE_URL.",
      },
      { status: 503 },
    );
  }
}
