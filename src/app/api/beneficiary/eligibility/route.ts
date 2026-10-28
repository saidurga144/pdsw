import { NextResponse } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { ServerBeneficiaryService } from "@/server/services/beneficiary.service";

export const GET = withAuth(
  async (req, { user }) => {
    const benId = req.nextUrl.searchParams.get("beneficiaryId") || "ben-001";
    const eligibility = await ServerBeneficiaryService.getEligibility(benId);
    return NextResponse.json({ success: true, eligibility });
  },
  { requiredRoles: ["BENEFICIARY", "OFFICER", "ADMIN", "SOC"] },
);
