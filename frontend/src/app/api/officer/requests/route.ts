import { NextRequest } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { proxyFastApiJson } from "@/server/services/fastapi-proxy";

export const GET = withAuth(
  async (req: NextRequest) => {
    return proxyFastApiJson(req, "/api/requests/officer", "GET");
  },
  { requiredRoles: ["PDS_OFFICER", "ADMIN", "SOC_ANALYST"] },
);
