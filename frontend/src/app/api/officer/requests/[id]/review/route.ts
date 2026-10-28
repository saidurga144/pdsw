import { NextResponse } from "next/server";
import { withAuth, getClientIp } from "@/server/middleware/auth.middleware";
import { ServerOfficerService } from "@/server/services/officer.service";

export const POST = withAuth(
  async (req, { user, params }) => {
    const ipAddress = getClientIp(req);
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

    const result = await ServerOfficerService.reviewChangeRequest(
      requestId,
      body.status,
      body.reviewNotes,
      user.userId,
      ipAddress,
    );

    return NextResponse.json(result);
  },
  { requiredRoles: ["PDS_OFFICER", "ADMIN"] },
);
