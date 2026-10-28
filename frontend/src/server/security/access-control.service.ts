import { CanonicalRole } from "@/lib/role-utils";
import { AuditService } from "@/server/services/audit.service";
import { TinkEncryptionService } from "./tink-encryption.service";

export interface DecryptionAccessRequest {
  actorId: string;
  actorRole: CanonicalRole;
  resourceType:
    | "BENEFICIARY_PII"
    | "AADHAAR_REF"
    | "COMMODITY_RELEASE"
    | "CHANGE_REQUEST"
    | "SECURITY_LOG"
    | "AUDIT_TRAIL";
  resourceOwnerId?: string;
  resourceId: string;
  ciphertext: string;
  associatedData?: string;
  ipAddress?: string;
}

export class DecryptionAccessControlService {
  /**
   * Evaluates role-based authorization for decrypting sensitive fields and generates audit events.
   */
  static async authorizeAndDecrypt(req: DecryptionAccessRequest): Promise<{
    allowed: boolean;
    plaintext?: string;
    error?: string;
  }> {
    const {
      actorId,
      actorRole,
      resourceType,
      resourceOwnerId,
      resourceId,
      ciphertext,
      associatedData,
      ipAddress = "127.0.0.1",
    } = req;

    let isAuthorized = false;
    let denialReason = "";

    // 1. Role-Based Decryption Access Matrix
    switch (actorRole) {
      case "BENEFICIARY":
        // Citizens can ONLY decrypt their own personal identity / ration data
        if (
          resourceOwnerId &&
          (actorId === resourceOwnerId ||
            actorId === `usr-${resourceOwnerId.replace(/^ben-/, "")}`)
        ) {
          isAuthorized = true;
        } else if (
          resourceType === "BENEFICIARY_PII" &&
          actorId === resourceId
        ) {
          isAuthorized = true;
        } else {
          isAuthorized = false;
          denialReason =
            "Beneficiaries are restricted to their own personal record decryption.";
        }
        break;

      case "PDS_OFFICER":
        // PDS Officers can decrypt operational beneficiary details and commodity verification records
        if (
          [
            "BENEFICIARY_PII",
            "AADHAAR_REF",
            "COMMODITY_RELEASE",
            "CHANGE_REQUEST",
          ].includes(resourceType)
        ) {
          isAuthorized = true;
        } else {
          isAuthorized = false;
          denialReason =
            "Officers do not have clearance to decrypt internal system credentials or security logs.";
        }
        break;

      case "ADMIN":
        // Administrators manage system accounts and change requests, but cannot arbitrarily decrypt biometric/audit forensics without audit
        if (
          ["BENEFICIARY_PII", "CHANGE_REQUEST", "COMMODITY_RELEASE"].includes(
            resourceType,
          )
        ) {
          isAuthorized = true;
        } else {
          isAuthorized = true; // Admin authorized with mandatory audit trail
        }
        break;

      case "SOC_ANALYST":
        // SOC Analysts have clearance for security logs, telemetry, forensic incident payloads
        if (
          ["SECURITY_LOG", "AUDIT_TRAIL", "CHANGE_REQUEST"].includes(
            resourceType,
          )
        ) {
          isAuthorized = true;
        } else {
          isAuthorized = false;
          denialReason =
            "SOC Analysts are restricted to forensic and cyber telemetry scopes.";
        }
        break;

      default:
        isAuthorized = false;
        denialReason = "Unrecognized or unauthenticated role.";
        break;
    }

    // 2. Audit access evaluation
    if (!isAuthorized) {
      console.warn(
        `⛔ [DECRYPTION ACCESS DENIED] Actor [${actorId}|${actorRole}] on Resource [${resourceType}:${resourceId}]: ${denialReason}`,
      );
      await AuditService.recordEvent({
        actorId,
        actorRole,
        action: "DECRYPTION_ACCESS_DENIED",
        resource: resourceType,
        resourceId,
        ipAddress,
        outcome: "BLOCKED_RBAC",
        newState: { denialReason },
      });

      return { allowed: false, error: denialReason };
    }

    // 3. Perform Google Tink AEAD Decryption
    try {
      const plaintext = TinkEncryptionService.decrypt(
        ciphertext,
        associatedData,
      );

      // Record successful decryption audit log (WITHOUT exposing plaintext)
      await AuditService.recordEvent({
        actorId,
        actorRole,
        action: "SENSITIVE_DATA_DECRYPTED",
        resource: resourceType,
        resourceId,
        ipAddress,
        outcome: "SUCCESS",
        newState: {
          resourceType,
          authorized: true,
          timestamp: new Date().toISOString(),
        },
      });

      return { allowed: true, plaintext };
    } catch (err: any) {
      await AuditService.recordEvent({
        actorId,
        actorRole,
        action: "DECRYPTION_EXECUTION_FAILED",
        resource: resourceType,
        resourceId,
        ipAddress,
        outcome: "FAILURE",
        newState: { error: err.message },
      });

      return {
        allowed: false,
        error: `Decryption execution error: ${err.message}`,
      };
    }
  }
}
