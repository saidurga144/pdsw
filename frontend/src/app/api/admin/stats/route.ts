import { NextResponse } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { ProvisionError, ServerAdminService } from "@/server/services/admin.service";

export const GET = withAuth(
  async (req) => {
    const token =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      req.cookies.get("pds_token")?.value;
    try {
      const stats = await ServerAdminService.getPlatformStats(token);
      return NextResponse.json({ success: true, stats });
    } catch (error) {
      if (error instanceof ProvisionError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
      }
      throw error;
    }
  },
  { requiredRoles: ["ADMIN"] },
);
