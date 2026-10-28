import { NextResponse } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { AuditService } from "@/server/services/audit.service";

export const GET = withAuth(
  async () => {
    const report = await AuditService.verifyChainIntegrity();
    return NextResponse.json({ success: true, report });
  },
  { requiredRoles: ["SOC", "ADMIN", "SOC"] },
);
