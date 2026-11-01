import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { proxyFastApiJson } from "@/server/services/fastapi-proxy";

export const PATCH = withAuth(
  async (req: NextRequest, { params }) => {
    const requestId = params.id;
    if (typeof requestId !== "string" || !requestId) {
      return NextResponse.json(
        { success: false, error: "Request ID is required." },
        { status: 400 },
      );
    }

    return proxyFastApiJson(
      req,
      `/api/requests/${encodeURIComponent(requestId)}/withdraw`,
      "PATCH",
    );
  },
  { requiredRoles: ["BENEFICIARY"] },
);
