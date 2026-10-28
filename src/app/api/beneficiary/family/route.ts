import { NextResponse } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { ServerBeneficiaryService } from "@/server/services/beneficiary.service";

export const GET = withAuth(
  async (req, { user }) => {
    const searchParams = req.nextUrl.searchParams;
    const benId = searchParams.get("beneficiaryId") || "ben-001";
    const family = await ServerBeneficiaryService.getFamilyMembers(benId);
    return NextResponse.json({ success: true, familyMembers: family });
  },
  { requiredRoles: ["BENEFICIARY", "OFFICER", "ADMIN", "SOC"] },
);
