import { NextResponse } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { AuditService } from "@/server/services/audit.service";

export const GET = withAuth(
  async (req) => {
    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const actorRole = searchParams.get("actorRole") || undefined;
    const action = searchParams.get("action") || undefined;
    const resource = searchParams.get("resource") || undefined;
    const outcome = searchParams.get("outcome") || undefined;

    const result = await AuditService.getAuditLogs({
      limit,
      offset,
      actorRole,
      action,
      resource,
      outcome,
    });

    return NextResponse.json({ success: true, ...result });
  },
  { requiredRoles: ["SOC", "ADMIN", "SOC"] },
);
