import { NextResponse } from "next/server";
import { withAuth, getClientIp } from "@/server/middleware/auth.middleware";
import { ServerOfficerService } from "@/server/services/officer.service";

export const POST = withAuth(
  async (req, { user }) => {
    const ipAddress = getClientIp(req);
    const body = await req.json();

    const result = await ServerOfficerService.executeDistribution({
      beneficiaryId: body.beneficiaryId,
      rationCardNumber: body.rationCardNumber,
      fpsShopId: body.fpsShopId || "FPS-JAIPUR-001",
      officerId: user.userId,
      riceQty: Number(body.riceQty) || 0,
      wheatQty: Number(body.wheatQty) || 0,
      sugarQty: Number(body.sugarQty) || 0,
      keroseneQty: Number(body.keroseneQty) || 0,
      totalCost: Number(body.totalCost) || 120.0,
      authMode: body.authMode || "BIOMETRIC_AADHAAR",
      ipAddress,
    });

    return NextResponse.json({ success: true, ...result });
  },
  { requiredRoles: ["OFFICER", "ADMIN"] },
);
