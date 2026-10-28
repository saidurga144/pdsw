import { NextResponse } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { ServerOfficerService } from "@/server/services/officer.service";

export const GET = withAuth(
  async () => {
    const requests = await ServerOfficerService.getChangeRequests();
    return NextResponse.json({ success: true, requests });
  },
  { requiredRoles: ["PDS_OFFICER", "ADMIN", "SOC_ANALYST"] },
);
