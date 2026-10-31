import { NextRequest } from "next/server";
import { withAuth } from "@/server/middleware/auth.middleware";
import { proxyFastApiJson } from "@/server/services/fastapi-proxy";

export const GET = withAuth(
  async (req: NextRequest) =>
    proxyFastApiJson(req, "/api/requests/ipfs-documents", "GET"),
  { requiredRoles: ["ADMIN"] },
);
