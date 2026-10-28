import { NextResponse } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { SocService } from "@/server/services/soc.service";

export const GET = withAuth(
  async (req) => {
    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const severity = searchParams.get("severity") || undefined;
    const status = searchParams.get("status") || undefined;

    const alerts = await SocService.getAlerts({ limit, severity, status });
    return NextResponse.json({ success: true, alerts });
  },
  { requiredRoles: ["SOC", "ADMIN", "SOC"] },
);
