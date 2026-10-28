import { NextRequest, NextResponse } from "next/server";
import { verifyJwtToken } from "@/server/auth/jwt";
import { AuditService } from "@/server/services/audit.service";
import { getClientIp } from "@/server/middleware/auth.middleware";

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const token =
    req.cookies.get("pds_token")?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (token) {
    const payload = verifyJwtToken(token);
    if (payload) {
      await AuditService.recordEvent({
        actorId: payload.userId,
        actorRole: payload.role,
        action: "USER_LOGOUT",
        resource: "AUTH_SESSION",
        resourceId: payload.userId,
        ipAddress,
        outcome: "SUCCESS",
      });
    }
  }

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully.",
  });
  response.cookies.set("pds_token", "", { path: "/", maxAge: 0 });
  response.cookies.set("pds_role", "", { path: "/", maxAge: 0 });

  return response;
}
