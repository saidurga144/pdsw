import { NextResponse } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { ServerAdminService } from "@/server/services/admin.service";

export const GET = withAuth(
  async () => {
    const stats = await ServerAdminService.getPlatformStats();
    return NextResponse.json({ success: true, stats });
  },
  { requiredRoles: ["ADMIN", "SOC", "SOC"] },
);
