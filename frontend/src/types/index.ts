export type Role = 'BENEFICIARY' | 'PDS_OFFICER' | 'ADMIN' | 'SOC_ANALYST';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  walletAddress?: string;
  phone?: string;
  avatarUrl?: string;
  avatar?: string;
  jurisdiction?: string;
  assignedDistrict?: string;
  pdsCenterId?: string;
  beneficiaryId?: string;
  lastLoginAt?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
}

export interface Permission {
  module: 'BENEFICIARY' | 'FAMILY' | 'ELIGIBILITY' | 'DISTRIBUTION' | 'USERS' | 'ROLES' | 'AI_RISK' | 'INTEGRITY' | 'SECURITY' | 'AUDIT' | 'SETTINGS';
  canView: boolean;
  canCreate: boolean;
  canModify: boolean;
  canDelete: boolean;
  canVerify: boolean;
  canApprove: boolean;
}

export interface RolePermissions {
  role: Role;
  permissions: Permission[];
}

export type RationCategory = 'AAY' | 'PHH' | 'NPHH' | 'SPECIAL';

export interface FamilyMember {
  id: string;
  beneficiaryId: string;
  fullName: string;
  relationship: 'HEAD' | 'SPOUSE' | 'SON' | 'DAUGHTER' | 'FATHER' | 'MOTHER' | 'OTHER';
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  uidHash: string;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  addedAt: string;
}

export interface Eligibility {
  beneficiaryId: string;
  category: RationCategory;
  monthlyEntitlements: {
    commodity: string;
    quantity: number;
    unit: string;
    subsidizedPricePerUnit: number;
  }[];
  monthlyIncome: number;
  isBPL: boolean;
  lastReviewedAt: string;
  nextReviewDue: string;
  status: 'ELIGIBLE' | 'SUSPENDED' | 'UNDER_REVIEW' | 'INELIGIBLE';
}

export interface Beneficiary {
  id: string;
  rationCardId: string;
  fullName: string;
  phone: string;
  address: {
    doorNo: string;
    street: string;
    district: string;
    state: string;
    pincode: string;
    pdsCenterId: string;
    pdsCenterName: string;
  };
  rationCategory: RationCategory;
  familyCount: number;
  familyMembers: FamilyMember[];
  eligibility: Eligibility;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'FLAGGED' | 'DEACTIVATED';
  riskScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  currentHash: string;
  latestIPFSCid: string;
  createdAt: string;
  updatedAt: string;
}

export type ChangeRequestType =
  | 'ADDRESS_CHANGE'
  | 'CONTACT_UPDATE'
  | 'FAMILY_ADDITION'
  | 'FAMILY_REMOVAL'
  | 'ELIGIBILITY_REVIEW'
  | 'MIGRATION_TRANSFER';

export type ChangeRequestStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'OFFICER_VERIFICATION'
  | 'APPROVED'
  | 'REJECTED'
  | 'ESCALATED';

export interface ChangeRequest {
  id: string;
  beneficiaryId: string;
  beneficiaryName: string;
  rationCardId: string;
  requestType: ChangeRequestType;
  submittedAt: string;
  status: ChangeRequestStatus;
  previousData: Record<string, any>;
  requestedData: Record<string, any>;
  reason: string;
  supportingDocuments: string[];
  aiRiskScore: number;
  aiRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  aiExplainabilityNotes: string[];
  officerRemarks?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface CommodityItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
}

export interface Distribution {
  id: string;
  transactionId: string;
  beneficiaryId: string;
  beneficiaryName: string;
  rationCardId: string;
  pdsCenterId: string;
  officerId: string;
  commodities: CommodityItem[];
  totalAmount: number;
  timestamp: string;
  status: 'COMPLETED' | 'CANCELLED' | 'PENDING_CONFIRMATION';
  verificationMethod: 'BIOMETRIC_SIMULATED' | 'OTP_SIMULATED' | 'OFFICER_VERIFIED';
  receiptHash: string;
  ipfsCid: string;
}

export interface RecordVersion {
  version: number;
  operation: 'CREATE' | 'PROFILE_MODIFY' | 'FAMILY_MEMBER_ADDED' | 'FAMILY_MEMBER_REMOVED' | 'ELIGIBILITY_CHANGED' | 'LOCATION_TRANSFER' | 'DEACTIVATION';
  previousHash: string;
  currentHash: string;
  ipfsCid: string;
  actorId: string;
  actorRole: string;
  timestamp: string;
  changeSummary: string;
}

export interface IntegrityVerification {
  recordId: string;
  recordType: 'BENEFICIARY' | 'TRANSACTION' | 'ELIGIBILITY';
  expectedHash: string;
  currentDatabaseHash: string;
  ipfsEvidenceCid: string;
  status: 'VERIFIED' | 'MISMATCH_DETECTED' | 'VERIFICATION_PENDING';
  lastVerifiedAt: string;
  tamperAlertDetails?: string;
}

export interface IPFSEvidence {
  cid: string;
  eventId: string;
  recordId: string;
  operation: string;
  previousHash: string;
  currentHash: string;
  actor: string;
  timestamp: string;
  status: 'VERIFIED' | 'MISMATCH';
  payloadSize: string;
  pinned: boolean;
}

export interface AIRiskAssessment {
  entityId: string;
  entityName: string;
  entityType: 'BENEFICIARY' | 'OFFICER' | 'PDS_CENTER';
  riskScore: number; // 0 - 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  analyzedAt: string;
  explainableFactors: {
    factor: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
  }[];
  suspiciousActivityCount: number;
  historicalTrend: { timestamp: string; score: number }[];
}

export interface AnomalyAlert {
  id: string;
  entityId: string;
  entityName: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  detectionTime: string;
  status: 'NEW' | 'UNDER_INVESTIGATION' | 'FALSE_POSITIVE' | 'RESOLVED' | 'ESCALATED';
  summary: string;
  explainableReasons: string[];
  suggestedAction: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  category: 'AUTHENTICATION' | 'API_SECURITY' | 'AUTHORIZATION' | 'DATA_SECURITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actor: string;
  actorRole: string;
  ipAddress: string;
  action: string;
  details: string;
  riskScore: number;
  resolved: boolean;
}

export interface SecurityIncident {
  id: string;
  title: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedAt: string;
  affectedEntity: string;
  status: 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'CLOSED';
  aiExplainability: {
    normalPattern: string;
    observedBehavior: string;
    riskScore: number;
    factors: string[];
  };
  assignedTo?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  role: Role;
  action: string;
  entity: string;
  recordId: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  integrityStatus: 'VERIFIED' | 'MISMATCH' | 'UNVERIFIED';
  previousHash: string;
  currentHash: string;
  ipfsCid: string;
  ipAddress: string;
}

export interface Notification {
  id: string;
  category: 'SYSTEM' | 'SECURITY' | 'AI_RISK' | 'BENEFICIARY' | 'ELIGIBILITY' | 'DISTRIBUTION' | 'INTEGRITY' | 'AUDIT';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  linkUrl?: string;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
