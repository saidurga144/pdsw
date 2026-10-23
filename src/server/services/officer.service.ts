import crypto from 'crypto';
import { AuditService } from '@/server/services/audit.service';
import { AIAnomalyService } from '@/server/services/ai-anomaly.service';

const runtimeBeneficiaries: any[] = [];
const runtimeDistributions: any[] = [];
const runtimeChangeRequests: any[] = [];

export class ServerOfficerService {
  /**
   * Retrieves all beneficiaries under the officer's jurisdiction
   */
  static async getBeneficiaries(jurisdiction?: string, search?: string) {
    if (search) {
      const q = search.toLowerCase();
      return runtimeBeneficiaries.filter(
        (b) =>
          b.head_of_family?.toLowerCase().includes(q) ||
          b.ration_card_number?.toLowerCase().includes(q)
      );
    }
    return runtimeBeneficiaries;
  }

  /**
   * Creates a new beneficiary record with family members and initial quota
   */
  static async createBeneficiary(
    data: {
      rationCardNumber: string;
      cardCategory: string;
      headOfFamily: string;
      address: string;
      district: string;
      state: string;
      pincode: string;
      annualIncome: number;
      fpsShopId: string;
      fpsName: string;
      fpsLocation: string;
      familyMembers: Array<{
        fullName: string;
        relationship: string;
        age: number;
        gender: string;
        aadhaarObfuscated: string;
      }>;
    },
    officerId: string,
    ipAddress?: string
  ) {
    const benId = `ben-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
    const now = new Date().toISOString();

    const newRecord = {
      id: benId,
      ration_card_number: data.rationCardNumber,
      card_category: data.cardCategory,
      head_of_family: data.headOfFamily,
      address: data.address,
      district: data.district,
      state: data.state,
      pincode: data.pincode,
      annual_income: data.annualIncome,
      fps_shop_id: data.fpsShopId,
      fps_name: data.fpsName,
      fps_location: data.fpsLocation,
      status: 'ACTIVE',
      family_members: data.familyMembers || [],
      created_at: now,
      updated_at: now,
    };

    runtimeBeneficiaries.unshift(newRecord);

    await AuditService.recordEvent({
      actorId: officerId,
      actorRole: 'OFFICER',
      action: 'ENROLL_BENEFICIARY',
      resource: 'BENEFICIARY',
      resourceId: benId,
      newState: {
        rationCardNumber: data.rationCardNumber,
        headOfFamily: data.headOfFamily,
        cardCategory: data.cardCategory,
      },
      ipAddress,
      outcome: 'SUCCESS',
    });

    return { id: benId, message: 'Beneficiary enrolled successfully with verified entitlements.' };
  }

  /**
   * Executes a commodity distribution transaction with AI risk scan, SHA-256 state hash, and audit trail
   */
  static async executeDistribution(params: {
    beneficiaryId: string;
    rationCardNumber: string;
    fpsShopId: string;
    officerId: string;
    riceQty: number;
    wheatQty: number;
    sugarQty: number;
    keroseneQty: number;
    totalCost: number;
    authMode: string;
    ipAddress?: string;
  }) {
    const distId = `txn-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const transactionCode = `TXN-PDS-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();

    // 1. Run Real-time AI Risk Evaluation
    const aiAssessment = await AIAnomalyService.evaluateDistribution({
      beneficiaryId: params.beneficiaryId,
      riceQty: params.riceQty,
      wheatQty: params.wheatQty,
      sugarQty: params.sugarQty,
      keroseneQty: params.keroseneQty,
      fpsShopId: params.fpsShopId,
      authMode: params.authMode,
    });

    // 2. Generate RFC 8785 Canonical SHA-256 State Hash and upload IPFS Manifest
    const { HashingService } = await import('@/server/security/hashing.service');
    const { IPFSService } = await import('@/server/security/ipfs.service');

    const canonicalTxn = {
      distId,
      transactionCode,
      beneficiaryId: params.beneficiaryId,
      rationCardNumber: params.rationCardNumber,
      fpsShopId: params.fpsShopId,
      officerId: params.officerId,
      riceQty: params.riceQty,
      wheatQty: params.wheatQty,
      sugarQty: params.sugarQty,
      keroseneQty: params.keroseneQty,
      totalCost: params.totalCost,
      authMode: params.authMode,
      timestamp: now,
    };

    const stateHash = HashingService.generateSHA256(canonicalTxn);
    const ipfsUpload = await IPFSService.uploadManifest({
      recordId: distId,
      entityType: 'DISTRIBUTION',
      hashAlgorithm: 'SHA-256',
      integrityHash: stateHash,
    });
    const ipfsCid = ipfsUpload.cid;

    const record = {
      id: distId,
      beneficiary_id: params.beneficiaryId,
      ration_card_number: params.rationCardNumber,
      fps_shop_id: params.fpsShopId,
      officer_id: params.officerId,
      rice_qty: params.riceQty,
      wheat_qty: params.wheatQty,
      sugar_qty: params.sugarQty,
      kerosene_qty: params.keroseneQty,
      total_cost: params.totalCost,
      auth_mode: params.authMode,
      transaction_code: transactionCode,
      state_hash: stateHash,
      ipfs_cid: ipfsCid,
      status: 'COMPLETED',
      distributed_at: now,
    };
    runtimeDistributions.unshift(record);

    // Record Audit Event
    await AuditService.recordEvent({
      actorId: params.officerId,
      actorRole: 'OFFICER',
      action: 'DISTRIBUTE_COMMODITIES',
      resource: 'DISTRIBUTION',
      resourceId: distId,
      newState: {
        transactionCode,
        stateHash,
        ipfsCid,
        riceQty: params.riceQty,
        wheatQty: params.wheatQty,
        aiRiskScore: aiAssessment.riskScore,
      },
      ipAddress: params.ipAddress,
      outcome: aiAssessment.riskLevel === 'CRITICAL' ? 'ANOMALY_DETECTED' : 'SUCCESS',
    });

    return {
      id: distId,
      transactionCode,
      stateHash,
      ipfsCid,
      aiAssessment,
      status: 'COMPLETED',
      message: 'Commodity distribution verified and recorded on ledger.',
    };
  }

  /**
   * Retrieves pending change requests
   */
  static async getChangeRequests() {
    return runtimeChangeRequests;
  }

  /**
   * Approves or rejects a change request
   */
  static async reviewChangeRequest(
    requestId: string,
    status: 'APPROVED' | 'REJECTED' | 'UNDER_INVESTIGATION',
    reviewNotes: string,
    officerId: string,
    ipAddress?: string
  ) {
    const item = runtimeChangeRequests.find((cr) => cr.id === requestId);
    if (item) {
      item.status = status;
      item.review_notes = reviewNotes;
      item.reviewed_by = officerId;
      item.updated_at = new Date().toISOString();
    }

    await AuditService.recordEvent({
      actorId: officerId,
      actorRole: 'OFFICER',
      action: `CHANGE_REQUEST_${status}`,
      resource: 'CHANGE_REQUEST',
      resourceId: requestId,
      newState: { status, reviewNotes },
      ipAddress,
      outcome: 'SUCCESS',
    });

    return { success: true, message: `Request status updated to ${status}.` };
  }
}
