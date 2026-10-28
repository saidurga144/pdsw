import { NextResponse } from "next/server";
import { withAuth, getClientIp } from "@/server/middleware/auth.middleware";
import { ServerOfficerService } from "@/server/services/officer.service";

export const GET = withAuth(
  async (req, { user }) => {
    const token =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      req.cookies.get("pds_token")?.value;
    try {
      const beneficiaries = await ServerOfficerService.getBeneficiaries(token);
      return NextResponse.json({ success: true, beneficiaries });
    } catch (err: any) {
      return NextResponse.json(
        {
          success: false,
          error: err.message || "Unable to load beneficiaries.",
        },
        { status: 502 },
      );
    }
  },
  { requiredRoles: ["PDS_OFFICER"] },
);

export const POST = withAuth(
  async (req, { user }) => {
    const ipAddress = getClientIp(req);
    const token =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      req.cookies.get("pds_token")?.value;
    const body = await req.json();

    try {
      const result = await ServerOfficerService.createBeneficiary(
        body,
        user.userId,
        ipAddress,
        token,
      );
      return NextResponse.json({ success: true, ...result }, { status: 201 });
    } catch (err: any) {
      return NextResponse.json(
        {
          success: false,
          error: err.message || "Failed to create beneficiary account.",
        },
        { status: 400 },
      );
    }
  },
  { requiredRoles: ["PDS_OFFICER"] },
);
