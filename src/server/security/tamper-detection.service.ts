import crypto from 'crypto';
import { VerificationResult } from './integrity.service';
import { SocService } from '@/server/services/soc.service';
import { AuditService } from '@/server/services/audit.service';

export class TamperDetectionService {
  /**
   * Handles tampering anomalies: alerts SOC, creates incident, and records immutable audit log.
   */
  static async handleTamperingIncident(result: VerificationResult, context: {
    actorId?: string;
    actorRole?: string;
    ipAddress?: string;
    resourceName?: string;
  } = {}): Promise<{ incidentLogged: boolean; alertId: string }> {
    const alertId = `alt-tamper-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const actorId = context.actorId || 'SYSTEM_INTEGRITY_DAEMON';
    const actorRole = context.actorRole || 'SYSTEM';
    const ipAddress = context.ipAddress || '127.0.0.1';

    console.error(`🚨 [TAMPER DETECTION ALERT] Cryptographic mismatch on Record: ${result.record_id} (${result.entity_type})`);

    // 1. Ingest High-Priority Security Event
    try {
      await SocService.logSecurityEvent({
        eventType: 'INTEGRITY_MISMATCH',
        severity: result.severity || 'CRITICAL',
        userId: actorId,
        userRole: actorRole,
        ipAddress,
        endpoint: `/security/verify/${result.entity_type}/${result.record_id}`,
        details: {
          recordId: result.record_id,
          entityType: result.entity_type,
          databaseIntegrity: result.database_integrity,
          ipfsIntegrity: result.ipfs_integrity,
          computedHash: result.computed_hash,
          storedDatabaseHash: result.stored_database_hash,
          ipfsManifestHash: result.ipfs_manifest_hash,
          ipfsCid: result.ipfs_cid,
          errorDetails: result.error_details,
          tamperingDetected: true,
          alertId,
        },
      });
    } catch (err: any) {
      console.warn('⚠️ [TamperDetection] Failed to log security event:', err.message);
    }

    // 2. Record Immutable Audit Event with SHA-256 chain
    try {
      await AuditService.recordEvent({
        actorId,
        actorRole,
        action: 'TAMPER_ALERT_TRIGGERED',
        resource: result.entity_type || 'INTEGRITY_MONITOR',
        resourceId: result.record_id,
        previousState: { storedHash: result.stored_database_hash, ipfsCid: result.ipfs_cid },
        newState: { computedHash: result.computed_hash, tamperingDetected: true, alertId },
        ipAddress,
        outcome: 'ANOMALY_DETECTED',
      });
    } catch (err: any) {
      console.warn('⚠️ [TamperDetection] Failed to append audit event:', err.message);
    }

    return { incidentLogged: true, alertId };
  }
}
