import { NextRequest } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { proxyFastApiJson } from "@/server/services/fastapi-proxy";

export const GET = withAuth(
  async (req) => proxyFastApiJson(req, "/api/requests/mine", "GET"),
  { requiredRoles: ["BENEFICIARY"] },
);

export const POST = withAuth(
  async (req: NextRequest) => {
    const body = await req.json();
    return proxyFastApiJson(req, "/api/requests", "POST", body);
  },
  { requiredRoles: ["BENEFICIARY", "PDS_OFFICER", "ADMIN"] },
);
