import { NextRequest } from "next/server";
import { AuditService } from "@/server/services/audit.service";
import { getClientIp } from "./auth.middleware";

export class AuditLoggerMiddleware {
  /**
   * Logs a security or operational event to the immutable audit chain in database.
   */
  static async logEvent(params: {
    req: NextRequest;
    actorId: string;
    actorRole: string;
    action: string;
    resource: string;
    resourceId: string;
    outcome?: "SUCCESS" | "FAILURE" | "BLOCKED_RBAC" | "ANOMALY_DETECTED";
    previousState?: any;
    newState?: any;
  }): Promise<void> {
    const ipAddress = getClientIp(params.req);
    const sessionId = params.req.cookies.get("pds_session")?.value || undefined;

    await AuditService.recordEvent({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      ipAddress,
      sessionId,
      outcome: params.outcome || "SUCCESS",
      previousState: params.previousState,
      newState: params.newState,
    });
  }
}
