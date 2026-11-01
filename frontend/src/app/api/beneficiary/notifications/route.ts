import { NextRequest } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { proxyFastApiJson } from "@/server/services/fastapi-proxy";

export const GET = withAuth(
  async (req: NextRequest) =>
    proxyFastApiJson(req, "/api/portal/beneficiary/notifications", "GET"),
  { requiredRoles: ["BENEFICIARY"] },
);

export const PATCH = withAuth(
  async (req: NextRequest) =>
    proxyFastApiJson(req, "/api/portal/beneficiary/notifications/read-all", "PATCH"),
  { requiredRoles: ["BENEFICIARY"] },
);
