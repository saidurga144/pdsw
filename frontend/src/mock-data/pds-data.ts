import {
  User,
  Beneficiary,
  ChangeRequest,
  Distribution,
  RecordVersion,
  IntegrityVerification,
  IPFSEvidence,
  AIRiskAssessment,
  AnomalyAlert,
  SecurityEvent,
  SecurityIncident,
  AuditEvent,
  Notification,
  RolePermissions,
} from "@/types";

// Clean slate: No pre-seeded users or records
export const MOCK_USERS: User[] = [];

export const MOCK_BENEFICIARIES: Beneficiary[] = [];

export const MOCK_CHANGE_REQUESTS: ChangeRequest[] = [];

export const MOCK_DISTRIBUTIONS: Distribution[] = [];

export const MOCK_VERSION_HISTORY: RecordVersion[] = [];

export const MOCK_INTEGRITY_VERIFICATIONS: IntegrityVerification[] = [];

export const MOCK_IPFS_EVIDENCE: IPFSEvidence[] = [];

export const MOCK_AI_RISK_ASSESSMENTS: AIRiskAssessment[] = [];

export const MOCK_ANOMALY_ALERTS: AnomalyAlert[] = [];

export const MOCK_SECURITY_EVENTS: SecurityEvent[] = [];

export const MOCK_SECURITY_INCIDENTS: SecurityIncident[] = [];

export const MOCK_AUDIT_TRAIL: AuditEvent[] = [];

export const MOCK_NOTIFICATIONS: Notification[] = [];

export const MOCK_ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: "BENEFICIARY",
    permissions: [
      {
        module: "BENEFICIARY",
        canView: true,
        canCreate: false,
        canModify: false,
        canDelete: false,
        canVerify: false,
        canApprove: false,
      },
      {
        module: "FAMILY",
        canView: true,
        canCreate: true,
        canModify: false,
        canDelete: false,
        canVerify: false,
        canApprove: false,
      },
      {
        module: "ELIGIBILITY",
        canView: true,
        canCreate: false,
        canModify: false,
        canDelete: false,
        canVerify: false,
        canApprove: false,
      },
      {
        module: "DISTRIBUTION",
        canView: true,
        canCreate: false,
        canModify: false,
        canDelete: false,
        canVerify: false,
        canApprove: false,
      },
    ],
  },
  {
    role: "PDS_OFFICER",
    permissions: [
      {
        module: "BENEFICIARY",
        canView: true,
        canCreate: true,
        canModify: true,
        canDelete: false,
        canVerify: true,
        canApprove: false,
      },
      {
        module: "FAMILY",
        canView: true,
        canCreate: true,
        canModify: true,
        canDelete: true,
        canVerify: true,
        canApprove: false,
      },
      {
        module: "ELIGIBILITY",
        canView: true,
        canCreate: false,
        canModify: true,
        canDelete: false,
        canVerify: true,
        canApprove: true,
      },
      {
        module: "DISTRIBUTION",
        canView: true,
        canCreate: true,
        canModify: true,
        canDelete: false,
        canVerify: true,
        canApprove: true,
      },
    ],
  },
  {
    role: "ADMIN",
    permissions: [
      {
        module: "BENEFICIARY",
        canView: true,
        canCreate: true,
        canModify: true,
        canDelete: true,
        canVerify: true,
        canApprove: true,
      },
      {
        module: "USERS",
        canView: true,
        canCreate: true,
        canModify: true,
        canDelete: true,
        canVerify: true,
        canApprove: true,
      },
      {
        module: "ROLES",
        canView: true,
        canCreate: true,
        canModify: true,
        canDelete: true,
        canVerify: true,
        canApprove: true,
      },
      {
        module: "AI_RISK",
        canView: true,
        canCreate: true,
        canModify: true,
        canDelete: true,
        canVerify: true,
        canApprove: true,
      },
      {
        module: "INTEGRITY",
        canView: true,
        canCreate: true,
        canModify: true,
        canDelete: true,
        canVerify: true,
        canApprove: true,
      },
      {
        module: "SETTINGS",
        canView: true,
        canCreate: true,
        canModify: true,
        canDelete: true,
        canVerify: true,
        canApprove: true,
      },
    ],
  },
  {
    role: "SOC_ANALYST",
    permissions: [
      {
        module: "BENEFICIARY",
        canView: true,
        canCreate: false,
        canModify: false,
        canDelete: false,
        canVerify: true,
        canApprove: false,
      },
      {
        module: "SECURITY",
        canView: true,
        canCreate: true,
        canModify: true,
        canDelete: true,
        canVerify: true,
        canApprove: true,
      },
      {
        module: "AI_RISK",
        canView: true,
        canCreate: false,
        canModify: true,
        canDelete: false,
        canVerify: true,
        canApprove: true,
      },
      {
        module: "INTEGRITY",
        canView: true,
        canCreate: false,
        canModify: true,
        canDelete: false,
        canVerify: true,
        canApprove: true,
      },
      {
        module: "AUDIT",
        canView: true,
        canCreate: false,
        canModify: false,
        canDelete: false,
        canVerify: true,
        canApprove: false,
      },
    ],
  },
];
