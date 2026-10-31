import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { proxyFastApiJson } from "@/server/services/fastapi-proxy";

export const POST = withAuth(
  async (req: NextRequest, { params }) => {
    const body = await req.json();
    const routeRequestId = params.id;
    const requestId =
      typeof routeRequestId === "string"
        ? routeRequestId
        : typeof body.requestId === "string"
          ? body.requestId
          : null;

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: "Request ID is required." },
        { status: 400 },
      );
    }

    return proxyFastApiJson(
      req,
      `/api/requests/${encodeURIComponent(requestId)}/review`,
      "PATCH",
      {
        status: body.status,
        review_notes: body.reviewNotes ?? body.review_notes ?? "",
      },
    );
  },
  { requiredRoles: ["PDS_OFFICER", "ADMIN"] },
);
