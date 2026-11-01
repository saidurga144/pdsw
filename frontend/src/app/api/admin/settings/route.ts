import { NextRequest } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { proxyFastApiJson } from "@/server/services/fastapi-proxy";

export const GET = withAuth(
  async (req: NextRequest) => proxyFastApiJson(req, "/api/portal/admin/settings", "GET"),
  { requiredRoles: ["ADMIN"] },
);

export const PUT = withAuth(
  async (req: NextRequest) => proxyFastApiJson(req, "/api/portal/admin/settings", "PUT", await req.json()),
  { requiredRoles: ["ADMIN"] },
);
