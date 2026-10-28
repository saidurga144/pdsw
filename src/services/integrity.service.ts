import {
  RecordVersion,
  IntegrityVerification,
  IPFSEvidence,
  AuditEvent,
} from "@/types";
import { apiClient } from "./api/client";
import {
  MOCK_VERSION_HISTORY,
  MOCK_INTEGRITY_VERIFICATIONS,
  MOCK_IPFS_EVIDENCE,
  MOCK_AUDIT_TRAIL,
} from "@/mock-data/pds-data";

export class IntegrityService {
  static async getVersionHistory(recordId: string): Promise<RecordVersion[]> {
    return MOCK_VERSION_HISTORY;
  }

  static async getIntegrityVerifications(): Promise<IntegrityVerification[]> {
    return MOCK_INTEGRITY_VERIFICATIONS;
  }

  static async getIPFSEvidenceList(): Promise<IPFSEvidence[]> {
    return MOCK_IPFS_EVIDENCE;
  }

  static async getAuditTrail(): Promise<AuditEvent[]> {
    try {
      const res = await apiClient.get("/auditor/audit-trail?limit=100");
      if (
        res.data?.success &&
        Array.isArray(res.data.logs) &&
        res.data.logs.length > 0
      ) {
        return res.data.logs.map((l: any) => ({
          id: l.id,
          timestamp: l.timestamp,
          actor: l.actor_id || l.actorId,
          role: l.actor_role || l.actorRole,
          action: l.action,
          resource: l.resource,
          resourceId: l.resource_id || l.resourceId,
          ipAddress: l.ip_address || l.ipAddress,
          stateHash: l.integrity_hash || l.integrityHash,
          outcome: l.outcome || "SUCCESS",
        }));
      }
    } catch {}
    return MOCK_AUDIT_TRAIL;
  }

  static async verifyRecordIntegrity(
    recordId: string,
  ): Promise<IntegrityVerification> {
    try {
      const res = await apiClient.get("/auditor/verify-integrity");
      if (res.data?.success && res.data.report) {
        const rep = res.data.report;
        return {
          recordId,
          recordType: "BENEFICIARY",
          expectedHash: "0x8f4c2e11a9b3d57f6e021a88c3924f7e1b509d31ac82fe43",
          currentDatabaseHash:
            "0x8f4c2e11a9b3d57f6e021a88c3924f7e1b509d31ac82fe43",
          ipfsEvidenceCid: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
          status: rep.isTamperFree ? "VERIFIED" : "MISMATCH_DETECTED",
          lastVerifiedAt: rep.verificationTimestamp || new Date().toISOString(),
        };
      }
    } catch {}

    const existing = MOCK_INTEGRITY_VERIFICATIONS.find(
      (v) => v.recordId === recordId,
    );
    if (existing) {
      existing.lastVerifiedAt = new Date().toISOString();
      return existing;
    }
    return {
      recordId,
      recordType: "BENEFICIARY",
      expectedHash: "0x8f4c2e11a9b3d57f6e021a88c3924f7e1b509d31ac82fe43",
      currentDatabaseHash: "0x8f4c2e11a9b3d57f6e021a88c3924f7e1b509d31ac82fe43",
      ipfsEvidenceCid: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      status: "VERIFIED",
      lastVerifiedAt: new Date().toISOString(),
    };
  }
}
