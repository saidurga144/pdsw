import { NextRequest } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { proxyFastApiJson } from "@/server/services/fastapi-proxy";

export const POST = withAuth(
  async (req: NextRequest) =>
    proxyFastApiJson(req, "/api/portal/officer/distributions", "POST", await req.json()),
  { requiredRoles: ["PDS_OFFICER", "ADMIN"] },
);
