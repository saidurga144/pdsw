import { NextResponse } from "next/server";
import { withAuth, getClientIp } from "@/server/middleware/auth.middleware";
import { ServerOfficerService } from "@/server/services/officer.service";

/** PATCH /api/officer/beneficiaries/[id] — Edit beneficiary details */
export const PATCH = withAuth(
  async (req, { user, params }) => {
    const resolvedParams = await params;
    const id = typeof resolvedParams.id === "string" ? resolvedParams.id : null;
    if (!id)
      return NextResponse.json(
        { success: false, error: "Beneficiary ID is required." },
        { status: 400 },
      );

    const token =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      req.cookies.get("pds_token")?.value;
    const ipAddress = getClientIp(req);
    const body = await req.json();

    try {
      const requestedStatus = String(
        body.status || body.accountStatus || "",
      ).toUpperCase();
      if (requestedStatus === "ACTIVE" || requestedStatus === "INACTIVE") {
        const result = await ServerOfficerService.updateBeneficiaryStatus(
          id,
          requestedStatus as "ACTIVE" | "INACTIVE",
          user.userId,
          ipAddress,
          token,
        );
        return NextResponse.json({ success: true, ...result });
      }

      const result = await ServerOfficerService.updateBeneficiary(
        id,
        body,
        user.userId,
        ipAddress,
        token,
      );
      return NextResponse.json({ success: true, user: result });
    } catch (err: any) {
      return NextResponse.json(
        {
          success: false,
          error: err.message || "Failed to update beneficiary.",
        },
        { status: 400 },
      );
    }
  },
  { requiredRoles: ["PDS_OFFICER", "ADMIN"] },
);

/** DELETE /api/officer/beneficiaries/[id] — Deactivate beneficiary */
export const DELETE = withAuth(
  async (req, { user, params }) => {
    const id = typeof params.id === "string" ? params.id : null;
    if (!id)
      return NextResponse.json(
        { success: false, error: "Beneficiary ID is required." },
        { status: 400 },
      );

    const token =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      req.cookies.get("pds_token")?.value;
    const ipAddress = getClientIp(req);

    try {
      const result = await ServerOfficerService.deleteBeneficiary(
        id,
        user.userId,
        ipAddress,
        token,
      );
      return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
      return NextResponse.json(
        {
          success: false,
          error: err.message || "Failed to deactivate beneficiary.",
        },
        { status: 400 },
      );
    }
  },
  { requiredRoles: ["PDS_OFFICER", "ADMIN"] },
);
