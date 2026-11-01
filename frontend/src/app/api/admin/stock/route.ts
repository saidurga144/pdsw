import { NextRequest } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { proxyFastApiJson } from "@/server/services/fastapi-proxy";

export const GET = withAuth(
  async (req: NextRequest) => proxyFastApiJson(req, "/api/portal/admin/stock", "GET"),
  { requiredRoles: ["ADMIN"] },
);

export const PUT = withAuth(
  async (req: NextRequest) => proxyFastApiJson(req, "/api/portal/admin/stock", "PUT", await req.json()),
  { requiredRoles: ["ADMIN"] },
);
