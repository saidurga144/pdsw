import { NextRequest } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { proxyFastApiJson } from "@/server/services/fastapi-proxy";
import { Role } from "@/types";

const allowedRoles: Role[] = ["BENEFICIARY", "PDS_OFFICER", "ADMIN"];

export const GET = withAuth(
  async (req: NextRequest) => {
    const query = req.nextUrl.searchParams.toString();
    return proxyFastApiJson(req, `/api/portal/grievances${query ? `?${query}` : ""}`, "GET");
  },
  { requiredRoles: allowedRoles },
);

export const POST = withAuth(
  async (req: NextRequest) => {
    const body = await req.json();
    return proxyFastApiJson(req, "/api/portal/grievances", "POST", body);
  },
  { requiredRoles: allowedRoles },
);
