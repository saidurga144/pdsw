import { NextRequest } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { proxyFastApiJson } from "@/server/services/fastapi-proxy";

export const PATCH = withAuth(
  async (req: NextRequest, { params }) =>
    proxyFastApiJson(
      req,
      `/api/portal/beneficiary/notifications/${encodeURIComponent(String(params.id))}/read`,
      "PATCH",
    ),
  { requiredRoles: ["BENEFICIARY"] },
);
