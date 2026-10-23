import crypto from 'crypto';
import { Role } from '@/types';

const INTEGRITY_SALT = process.env.SHA256_INTEGRITY_SALT || 'pdsw-immutable-state-salt-2026';
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export interface CreateAuditParams {
  actorId: string;
  actorRole: Role | string;
  action: string;
  resource: string;
  resourceId: string;
  previousState?: any;
  newState?: any;
  ipAddress?: string;
  sessionId?: string;
  outcome?: 'SUCCESS' | 'FAILURE' | 'BLOCKED_RBAC' | 'ANOMALY_DETECTED';
}

export interface AuditRecord {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  resource: string;
  resource_id: string;
  previous_state: any;
  new_state: any;
  timestamp: string;
  ip_address: string;
  session_id: string;
  outcome: string;
  integrity_hash: string;
  previous_hash: string;
}

// In-memory chained audit log store
const runtimeAuditChain: AuditRecord[] = [];

export class AuditService {
  /**
   * Computes a deterministic SHA-256 integrity hash for an audit record linked to previous hash
   */
  static computeHash(
    previousHash: string,
    actorId: string,
    action: string,
    resource: string,
    resourceId: string,
    newState: any,
    timestamp: string
  ): string {
    const serializedState = typeof newState === 'string' ? newState : JSON.stringify(newState || {});
    const payload = `${previousHash}|${actorId}|${action}|${resource}|${resourceId}|${serializedState}|${timestamp}|${INTEGRITY_SALT}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Appends an immutable audit event with SHA-256 chain linkage
   */
  static async recordEvent(params: CreateAuditParams): Promise<AuditRecord> {
    const id = `aud-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const outcome = params.outcome || 'SUCCESS';
    const ipAddress = params.ipAddress || '127.0.0.1';
    const sessionId = params.sessionId || `sess-${crypto.randomBytes(6).toString('hex')}`;

    const previousHash =
      runtimeAuditChain.length > 0
        ? runtimeAuditChain[runtimeAuditChain.length - 1].integrity_hash
        : GENESIS_HASH;

    const integrityHash = this.computeHash(
      previousHash,
      params.actorId,
      params.actorRole,
      params.action,
      params.resourceId,
      params.newState,
      timestamp
    );

    const record: AuditRecord = {
      id,
      actor_id: params.actorId,
      actor_role: String(params.actorRole),
      action: params.action,
      resource: params.resource,
      resource_id: params.resourceId,
      previous_state: params.previousState,
      new_state: params.newState,
      timestamp,
      ip_address: ipAddress,
      session_id: sessionId,
      outcome,
      integrity_hash: integrityHash,
      previous_hash: previousHash,
    };

    runtimeAuditChain.push(record);
    return record;
  }

  /**
   * Retrieves paginated audit logs with search, role, and outcome filtering
   */
  static async getAuditLogs(options: {
    limit?: number;
    offset?: number;
    actorRole?: string;
    action?: string;
    resource?: string;
    outcome?: string;
  } = {}): Promise<{ total: number; logs: AuditRecord[] }> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    let filtered = [...runtimeAuditChain];

    if (options.actorRole && options.actorRole !== 'ALL') {
      filtered = filtered.filter((l) => l.actor_role === options.actorRole);
    }
    if (options.action && options.action !== 'ALL') {
      filtered = filtered.filter((l) => l.action === options.action);
    }
    if (options.resource) {
      const q = options.resource.toLowerCase();
      filtered = filtered.filter((l) => l.resource.toLowerCase().includes(q));
    }
    if (options.outcome && options.outcome !== 'ALL') {
      filtered = filtered.filter((l) => l.outcome === options.outcome);
    }

    // Sort descending by timestamp
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = filtered.length;
    const logs = filtered.slice(offset, offset + limit);

    return { total, logs };
  }

  /**
   * Cryptographically verifies the entire SHA-256 audit hash chain from genesis
   */
  static async verifyChainIntegrity(): Promise<{
    isTamperFree: boolean;
    totalVerified: number;
    compromisedIndex: number | null;
    compromisedRecordId: string | null;
    verificationTimestamp: string;
  }> {
    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < runtimeAuditChain.length; i++) {
      const record = runtimeAuditChain[i];

      if (record.previous_hash !== expectedPrevHash) {
        return {
          isTamperFree: false,
          totalVerified: i,
          compromisedIndex: i,
          compromisedRecordId: record.id,
          verificationTimestamp: new Date().toISOString(),
        };
      }

      const computed = this.computeHash(
        record.previous_hash,
        record.actor_id,
        record.actor_role,
        record.action,
        record.resource_id,
        record.new_state,
        record.timestamp
      );

      if (computed !== record.integrity_hash) {
        return {
          isTamperFree: false,
          totalVerified: i,
          compromisedIndex: i,
          compromisedRecordId: record.id,
          verificationTimestamp: new Date().toISOString(),
        };
      }

      expectedPrevHash = record.integrity_hash;
    }

    return {
      isTamperFree: true,
      totalVerified: runtimeAuditChain.length,
      compromisedIndex: null,
      compromisedRecordId: null,
      verificationTimestamp: new Date().toISOString(),
    };
  }
}
