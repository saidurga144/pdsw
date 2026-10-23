import crypto from 'crypto';

export interface SecurityEventDoc {
  id: string;
  eventType: 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'RBAC_VIOLATION' | 'SUSPICIOUS_IP' | 'BRUTE_FORCE_ATTEMPT' | 'INTEGRITY_MISMATCH' | 'API_RATE_SPIKE' | 'ANOMALOUS_QUOTA';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  userRole?: string;
  email?: string;
  ipAddress: string;
  userAgent?: string;
  endpoint?: string;
  details: Record<string, any>;
  timestamp: Date;
}

export interface SocAlertDoc {
  id: string;
  alertType: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  sourceIp: string;
  affectedUser?: string;
  triggerEventId: string;
  recommendedAction: string;
  incidentId?: string;
  timestamp: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface SocIncidentDoc {
  id: string;
  incidentId: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'CLOSED';
  assignedAnalyst?: string;
  impactedResources: string[];
  evidenceIds: string[];
  timeline: Array<{
    timestamp: Date;
    author: string;
    note: string;
    actionType: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory SOC telemetry storage
const runtimeSecurityEvents: any[] = [];
const runtimeSocAlerts: any[] = [];
const runtimeSocIncidents: any[] = [];

export class SocService {
  /**
   * Ingests a security event with SHA-512 cryptographic fingerprinting and IPFS CID provenance.
   */
  static async logSecurityEvent(event: Omit<SecurityEventDoc, 'id' | 'timestamp'>): Promise<string> {
    const id = `sec-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date();

    const { HashingService } = await import('@/server/security/hashing.service');
    const { IPFSService } = await import('@/server/security/ipfs.service');
    const { TinkEncryptionService } = await import('@/server/security/tink-encryption.service');
    const { KeyManagementService } = await import('@/server/security/key-management.service');

    const canonicalEvent = {
      id,
      eventType: event.eventType,
      severity: event.severity,
      userId: event.userId || '',
      userRole: event.userRole || '',
      ipAddress: event.ipAddress,
      endpoint: event.endpoint || '',
      timestamp: timestamp.toISOString(),
    };

    const integrityHashSha512 = HashingService.generateSHA512(canonicalEvent);

    const ipfsResult = await IPFSService.uploadManifest({
      recordId: id,
      entityType: 'SECURITY_LOG',
      hashAlgorithm: 'SHA-512',
      integrityHash: integrityHashSha512,
    });

    let encryptedDetails: string | undefined;
    if (event.details && Object.keys(event.details).length > 0) {
      encryptedDetails = TinkEncryptionService.encrypt(event.details, `pdsw:soc:event:${id}`);
    }

    const { version: keyVersion } = KeyManagementService.getPrimaryKey();

    const doc = {
      ...event,
      id,
      timestamp,
      integrity_hash_sha512: integrityHashSha512,
      ipfs_cid: ipfsResult.cid,
      encryption_version: keyVersion,
      encrypted_details: encryptedDetails,
    };

    runtimeSecurityEvents.unshift(doc);

    // Trigger detection engine in background
    this.evaluateDetectionRules(doc as any).catch(() => {});

    return id;
  }

  /**
   * Rule-based threat detection engine
   */
  private static async evaluateDetectionRules(event: SecurityEventDoc): Promise<void> {
    // 1. RULE: RBAC Privilege Escalation Attempt -> Instant CRITICAL Alert
    if (event.eventType === 'RBAC_VIOLATION') {
      const alertId = `alt-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      runtimeSocAlerts.unshift({
        id: alertId,
        alertType: 'RBAC_PRIVILEGE_ESCALATION',
        title: `Privilege Escalation Detected: Role [${event.userRole || 'UNKNOWN'}] on ${event.endpoint}`,
        description: `Unauthorized access attempt on protected resource by user ${event.userId || event.email || 'Anonymous'}. Endpoint: ${event.endpoint}`,
        severity: 'CRITICAL',
        status: 'ACTIVE',
        sourceIp: event.ipAddress,
        affectedUser: event.email || event.userId,
        triggerEventId: event.id,
        recommendedAction: 'Verify officer credentials, temporarily suspend session if repeated.',
        timestamp: new Date(),
      });
      return;
    }

    // 2. RULE: Brute Force Detection -> >3 Auth Failures in 5 mins
    if (event.eventType === 'AUTH_FAILURE') {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const recentFailures = runtimeSecurityEvents.filter(
        (e) => e.eventType === 'AUTH_FAILURE' && e.ipAddress === event.ipAddress && new Date(e.timestamp).getTime() >= fiveMinutesAgo
      ).length;

      if (recentFailures >= 3) {
        const alertId = `alt-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        runtimeSocAlerts.unshift({
          id: alertId,
          alertType: 'BRUTE_FORCE_AUTH_BURST',
          title: `Brute Force Pattern: ${recentFailures} Failed Logins from IP ${event.ipAddress}`,
          description: `Multiple repeated authentication failures detected within a 5-minute window for target ${event.email || 'Multiple Accounts'}.`,
          severity: recentFailures > 5 ? 'CRITICAL' : 'HIGH',
          status: 'ACTIVE',
          sourceIp: event.ipAddress,
          affectedUser: event.email,
          triggerEventId: event.id,
          recommendedAction: 'Apply IP rate-limit block and alert SOC on-call officer.',
          timestamp: new Date(),
        });
      }
    }

    // 3. RULE: Integrity Mismatch -> CRITICAL Alert
    if (event.eventType === 'INTEGRITY_MISMATCH') {
      const alertId = `alt-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      runtimeSocAlerts.unshift({
        id: alertId,
        alertType: 'SHA256_STATE_TAMPERING_DETECTED',
        title: `Cryptographic State Tamper Detected on Resource ${event.details?.resourceId || 'PDS State'}`,
        description: `Verification check failed. SHA-256 hash does not match computed state. Potential direct mutation or unauthorized state alteration.`,
        severity: 'CRITICAL',
        status: 'ACTIVE',
        sourceIp: event.ipAddress,
        triggerEventId: event.id,
        recommendedAction: 'Trigger emergency audit snapshot and lock affected beneficiary quota records.',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Retrieves active SOC alerts
   */
  static async getAlerts(options: { limit?: number; severity?: string; status?: string } = {}): Promise<SocAlertDoc[]> {
    const limit = options.limit || 50;
    let filtered = [...runtimeSocAlerts];

    if (options.severity && options.severity !== 'ALL') {
      filtered = filtered.filter((a) => a.severity === options.severity);
    }
    if (options.status && options.status !== 'ALL') {
      filtered = filtered.filter((a) => a.status === options.status);
    }

    return filtered.slice(0, limit);
  }

  /**
   * Retrieves security event stream
   */
  static async getSecurityEvents(options: { limit?: number; eventType?: string } = {}): Promise<SecurityEventDoc[]> {
    const limit = options.limit || 100;
    let filtered = [...runtimeSecurityEvents];

    if (options.eventType && options.eventType !== 'ALL') {
      filtered = filtered.filter((e) => e.eventType === options.eventType);
    }

    return filtered.slice(0, limit);
  }

  /**
   * Creates a formal SOC incident
   */
  static async createIncident(data: {
    title: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    assignedAnalyst: string;
    impactedResources: string[];
    evidenceIds: string[];
    initialNote?: string;
  }): Promise<SocIncidentDoc> {
    const incidentNum = Math.floor(1000 + Math.random() * 9000);
    const incidentId = `INC-2026-${incidentNum}`;
    const id = `inc-${Date.now()}`;
    const now = new Date();

    const doc: SocIncidentDoc = {
      id,
      incidentId,
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: 'INVESTIGATING',
      assignedAnalyst: data.assignedAnalyst || 'SOC Analyst Alpha',
      impactedResources: data.impactedResources || [],
      evidenceIds: data.evidenceIds || [],
      timeline: [
        {
          timestamp: now,
          author: data.assignedAnalyst || 'SOC Lead',
          note: data.initialNote || 'Incident formally initialized from security telemetry alerts.',
          actionType: 'INCIDENT_CREATED',
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    runtimeSocIncidents.unshift(doc);
    return doc;
  }

  /**
   * Retrieves all SOC incidents
   */
  static async getIncidents(): Promise<SocIncidentDoc[]> {
    return runtimeSocIncidents;
  }

  /**
   * Updates incident status and appends a forensic investigation note
   */
  static async updateIncidentStatus(
    incidentId: string,
    status: 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED' | 'CLOSED',
    note: string,
    author: string
  ): Promise<boolean> {
    const doc = runtimeSocIncidents.find((i) => i.incidentId === incidentId || i.id === incidentId);
    if (!doc) return false;

    const now = new Date();
    doc.status = status;
    doc.updatedAt = now;
    doc.timeline.push({
      timestamp: now,
      author: author || 'SOC Analyst',
      note: note || `Status transitioned to ${status}`,
      actionType: 'STATUS_UPDATE',
    });

    return true;
  }

  /**
   * Aggregates live SOC telemetry overview
   */
  static async getTelemetryStats(): Promise<{
    activeThreatsCount: number;
    rbacViolationsToday: number;
    failedAuth24h: number;
    criticalAlertsCount: number;
    threatIndex: number;
  }> {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const activeThreats = runtimeSocAlerts.filter((a) => a.status === 'ACTIVE' || a.status === 'INVESTIGATING').length;
    const rbacViolations = runtimeSecurityEvents.filter(
      (e) => e.eventType === 'RBAC_VIOLATION' && new Date(e.timestamp).getTime() >= oneDayAgo
    ).length;
    const failedAuth = runtimeSecurityEvents.filter(
      (e) => e.eventType === 'AUTH_FAILURE' && new Date(e.timestamp).getTime() >= oneDayAgo
    ).length;
    const criticalAlerts = runtimeSocAlerts.filter(
      (a) => a.severity === 'CRITICAL' && (a.status === 'ACTIVE' || a.status === 'INVESTIGATING')
    ).length;

    const threatIndex = Math.min(100, Math.round(activeThreats * 15 + criticalAlerts * 25 + rbacViolations * 10));

    return {
      activeThreatsCount: Math.max(0, activeThreats),
      rbacViolationsToday: rbacViolations,
      failedAuth24h: failedAuth,
      criticalAlertsCount: criticalAlerts,
      threatIndex: Math.max(10, threatIndex),
    };
  }
}
