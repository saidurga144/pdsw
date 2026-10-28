import { NextResponse } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { AIAnomalyService } from "@/server/services/ai-anomaly.service";

export const GET = withAuth(
  async () => {
    const anomalies = await AIAnomalyService.getRecentAnomalies(20);
    return NextResponse.json({ success: true, anomalies });
  },
  { requiredRoles: ["SOC_ANALYST", "ADMIN"] },
);
