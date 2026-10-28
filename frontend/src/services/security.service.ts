import { SecurityEvent, SecurityIncident } from "@/types";
import { apiClient } from "./api/client";
import {
  MOCK_SECURITY_EVENTS,
  MOCK_SECURITY_INCIDENTS,
} from "@/mock-data/pds-data";

export class SecurityService {
  static async getSecurityEvents(): Promise<SecurityEvent[]> {
    try {
      const res = await apiClient.get("/soc/events?limit=50");
      if (res.data?.success && Array.isArray(res.data.events)) {
        return res.data.events.map((e: any) => ({
          id: e.id,
          timestamp: e.timestamp,
          type: e.eventType,
          severity: e.severity,
          sourceIp: e.ipAddress,
          userOrRole: e.email || e.userRole || "System",
          description:
            e.details?.reason ||
            `${e.eventType} recorded on ${e.endpoint || "API"}`,
          isAnomaly: e.severity === "HIGH" || e.severity === "CRITICAL",
        }));
      }
    } catch {}
    return MOCK_SECURITY_EVENTS;
  }

  static async getSecurityIncidents(): Promise<SecurityIncident[]> {
    try {
      const res = await apiClient.get("/soc/incidents");
      if (res.data?.success && Array.isArray(res.data.incidents)) {
        return res.data.incidents.map((i: any) => ({
          id: i.incidentId || i.id,
          title: i.title,
          severity: i.severity,
          status: i.status,
          assignedTo: i.assignedAnalyst,
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
          description: i.description,
          impactedEntities: i.impactedResources,
          evidenceCids: i.evidenceIds,
          timeline: i.timeline,
        }));
      }
    } catch {}
    return MOCK_SECURITY_INCIDENTS;
  }

  static async updateIncidentStatus(
    id: string,
    status: SecurityIncident["status"],
  ): Promise<SecurityIncident> {
    try {
      await apiClient.patch("/soc/incidents", {
        incidentId: id,
        status,
        note: `Incident status updated to ${status}`,
      });
    } catch {}

    const incident = MOCK_SECURITY_INCIDENTS.find((i) => i.id === id);
    if (!incident) throw new Error("Incident not found");
    incident.status = status;
    return incident;
  }
}
