import { NextRequest } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { proxyFastApiJson } from "@/server/services/fastapi-proxy";

export const PATCH = withAuth(
  async (req: NextRequest, { params }) => {
    const body = await req.json();
    return proxyFastApiJson(
      req,
      `/api/portal/officer/verification/${encodeURIComponent(String(params.id))}`,
      "PATCH",
      body,
    );
  },
  { requiredRoles: ["PDS_OFFICER"] },
);
