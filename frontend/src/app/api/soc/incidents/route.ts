import { NextResponse } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { SocService } from "@/server/services/soc.service";

export const GET = withAuth(
  async () => {
    const incidents = await SocService.getIncidents();
    return NextResponse.json({ success: true, incidents });
  },
  { requiredRoles: ["SOC_ANALYST", "ADMIN"] },
);

export const POST = withAuth(
  async (req, { user }) => {
    const body = await req.json();
    const incident = await SocService.createIncident({
      title: body.title,
      description: body.description,
      severity: body.severity || "MEDIUM",
      assignedAnalyst: user.fullName || "SOC Lead",
      impactedResources: body.impactedResources || [],
      evidenceIds: body.evidenceIds || [],
      initialNote: body.initialNote,
    });
    return NextResponse.json({ success: true, incident });
  },
  { requiredRoles: ["SOC_ANALYST", "ADMIN"] },
);

export const PATCH = withAuth(
  async (req, { user }) => {
    const body = await req.json();
    const success = await SocService.updateIncidentStatus(
      body.incidentId,
      body.status,
      body.note,
      user.fullName,
    );
    return NextResponse.json({ success });
  },
  { requiredRoles: ["SOC_ANALYST", "ADMIN"] },
);
