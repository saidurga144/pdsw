import { NextResponse } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { ServerBeneficiaryService } from "@/server/services/beneficiary.service";

export const GET = withAuth(
  async (req, { user }) => {
    const profile = await ServerBeneficiaryService.getBeneficiaryByUserId(
      user.userId,
    );
    return NextResponse.json({ success: true, profile });
  },
  { requiredRoles: ["BENEFICIARY", "PDS_OFFICER", "ADMIN", "SOC_ANALYST"] },
);
