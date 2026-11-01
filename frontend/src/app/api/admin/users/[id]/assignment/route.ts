import { NextResponse } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import {
  ProvisionError,
  ServerAdminService,
} from "@/server/services/admin.service";

export const PATCH = withAuth(
  async (req, { params }) => {
    const token =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      req.cookies.get("pds_token")?.value;
    const resolvedParams = await params;
    const userId =
      typeof resolvedParams.id === "string" ? resolvedParams.id : "";

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Beneficiary ID is required." },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null);
    if (
      !body ||
      !(body.assigned_pds_officer_id === null ||
        (typeof body.assigned_pds_officer_id === "string" &&
          body.assigned_pds_officer_id.trim()))
    ) {
      return NextResponse.json(
        { success: false, error: "Choose a PDS Officer or Unassigned." },
        { status: 400 },
      );
    }

    try {
      const beneficiary = await ServerAdminService.assignBeneficiaryOfficer(
        userId,
        body.assigned_pds_officer_id?.trim() || null,
        token,
      );
      return NextResponse.json({ success: true, beneficiary });
    } catch (err) {
      const message =
        err instanceof ProvisionError
          ? err.message
          : "Failed to update beneficiary officer assignment.";
      const status = err instanceof ProvisionError ? err.status : 500;
      return NextResponse.json({ success: false, error: message }, { status });
    }
  },
  { requiredRoles: ["ADMIN"] },
);
