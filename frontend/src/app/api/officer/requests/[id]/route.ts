import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { proxyFastApiJson } from "@/server/services/fastapi-proxy";

export const GET = withAuth(
  async (req: NextRequest, { params }) => {
    const resolvedParams = await params;
    const requestId =
      typeof resolvedParams.id === "string" ? resolvedParams.id : "";
    if (!requestId) {
      return NextResponse.json(
        { success: false, error: "Request ID is required." },
        { status: 400 },
      );
    }
    return proxyFastApiJson(
      req,
      `/api/requests/${encodeURIComponent(requestId)}`,
      "GET",
    );
  },
  { requiredRoles: ["PDS_OFFICER", "ADMIN", "SOC_ANALYST"] },
);
