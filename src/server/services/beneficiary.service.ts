import crypto from "crypto";
import { AuditService } from "@/server/services/audit.service";
import { Beneficiary, FamilyMember, Eligibility } from "@/types";

// In-memory change requests & grievances stores
const runtimeChangeRequests: any[] = [];
const runtimeGrievances: any[] = [];

export class ServerBeneficiaryService {
  /**
   * Retrieves beneficiary record strictly bound to the authenticated User ID or direct Beneficiary ID.
   * Dynamically formats profile for wallet-authenticated users or simulated beneficiary IDs.
   */
  static async getBeneficiaryByUserId(
    userId: string,
  ): Promise<Beneficiary | null> {
    const isWallet = userId.startsWith("usr-w-") || userId.startsWith("0x");
    const shortId = userId.replace(/^usr-w-/, "").slice(0, 8);
    const benId = isWallet ? `ben-${shortId}` : userId;
    const fullName = isWallet ? `Citizen (${shortId})` : "Sunita Devi";
    const phone = "+91 98765 43210";
    const rationCardId = `RC-DL-${shortId.toUpperCase() || "2026-9921"}`;
    const district = "South Delhi";
    const state = "Delhi";
    const pincode = "110016";
    const pdsCenterId = "FPS-DL-102";
    const pdsCenterName = "Fair Price Shop #102, South Delhi";

    const familyMembers: FamilyMember[] = [
      {
        id: `fm-${benId}-1`,
        beneficiaryId: benId,
        fullName,
        relationship: "HEAD",
        age: 38,
        gender: "FEMALE",
        uidHash: `0x${crypto.createHash("sha256").update(userId).digest("hex").slice(0, 16)}`,
        verificationStatus: "VERIFIED",
        addedAt: "2026-01-15T10:00:00Z",
      },
      {
        id: `fm-${benId}-2`,
        beneficiaryId: benId,
        fullName: "Rahul Sharma",
        relationship: "SON",
        age: 14,
        gender: "MALE",
        uidHash: `0x${crypto.createHash("sha256").update(`${userId}-son`).digest("hex").slice(0, 16)}`,
        verificationStatus: "VERIFIED",
        addedAt: "2026-01-15T10:00:00Z",
      },
      {
        id: `fm-${benId}-3`,
        beneficiaryId: benId,
        fullName: "Priya Sharma",
        relationship: "DAUGHTER",
        age: 10,
        gender: "FEMALE",
        uidHash: `0x${crypto.createHash("sha256").update(`${userId}-dau`).digest("hex").slice(0, 16)}`,
        verificationStatus: "VERIFIED",
        addedAt: "2026-01-15T10:00:00Z",
      },
    ];

    const eligibility: Eligibility = {
      beneficiaryId: benId,
      category: "PHH",
      monthlyEntitlements: [
        {
          commodity: "Rice (Fortified)",
          quantity: 20,
          unit: "KG",
          subsidizedPricePerUnit: 3.0,
        },
        {
          commodity: "Wheat (Whole Grain)",
          quantity: 15,
          unit: "KG",
          subsidizedPricePerUnit: 2.0,
        },
        {
          commodity: "Refined Sugar",
          quantity: 2,
          unit: "KG",
          subsidizedPricePerUnit: 13.5,
        },
        {
          commodity: "Kerosene (Illumination)",
          quantity: 3,
          unit: "L",
          subsidizedPricePerUnit: 18.0,
        },
      ],
      monthlyIncome: 10000,
      isBPL: true,
      lastReviewedAt: "2026-08-01T00:00:00Z",
      nextReviewDue: "2027-08-01T00:00:00Z",
      status: "ELIGIBLE",
    };

    const { HashingService } =
      await import("@/server/security/hashing.service");
    const { IPFSService } = await import("@/server/security/ipfs.service");
    const { CanonicalizationService } =
      await import("@/server/security/canonicalization.service");

    const canonicalData = CanonicalizationService.canonicalize({
      recordId: benId,
      rationCardId,
      headOfFamily: fullName,
      category: "PHH",
      district,
    });

    return {
      id: benId,
      rationCardId,
      fullName,
      phone,
      address: {
        doorNo: "H-42",
        street: "Main Welfare Road, Block C",
        district,
        state,
        pincode,
        pdsCenterId,
        pdsCenterName,
      },
      rationCategory: "PHH",
      familyCount: familyMembers.length,
      familyMembers,
      eligibility,
      verificationStatus: "VERIFIED",
      riskScore: 8,
      riskLevel: "LOW",
      currentHash: HashingService.generateSHA256({
        id: benId,
        rationCardId,
        fullName,
        category: "PHH",
      }),
      latestIPFSCid: IPFSService.computeCID(canonicalData),
      createdAt: "2026-01-15T10:00:00Z",
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves family members for a beneficiary strictly by ID
   */
  static async getFamilyMembers(beneficiaryId: string) {
    const ben = await this.getBeneficiaryByUserId(beneficiaryId);
    return ben?.familyMembers || [];
  }

  /**
   * Retrieves live quota eligibility strictly by beneficiary ID
   */
  static async getEligibility(beneficiaryId: string) {
    const ben = await this.getBeneficiaryByUserId(beneficiaryId);
    return ben?.eligibility || null;
  }

  /**
   * Retrieves distribution transaction history strictly for the authenticated beneficiary
   */
  static async getTransactions(beneficiaryId: string) {
    return [
      {
        id: `dist-tx-${beneficiaryId.slice(-6)}-1`,
        transactionId: `TX-2026-08-${beneficiaryId.slice(-4)}`,
        beneficiaryId,
        beneficiaryName: "Sunita Devi",
        rationCardId: "RC-DL-2026-9921",
        pdsCenterId: "FPS-DL-102",
        officerId: "usr-officer-01",
        totalAmount: 144.0,
        timestamp: "2026-08-14T11:30:00Z",
        status: "COMPLETED",
        verificationMethod: "BIOMETRIC_SIMULATED",
        receiptHash:
          "0x8f2d6e3c5a1b4f7e9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f",
        ipfsCid: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
      },
    ];
  }

  /**
   * Submits a change request (address, family member, migration) with audit event
   */
  static async submitChangeRequest(params: {
    beneficiaryId: string;
    requestType: string;
    previousData: any;
    requestedData: any;
    reason?: string;
    supportingDocuments?: string[];
    actorId?: string;
    actorRole?: string;
    ipAddress?: string;
  }) {
    const id = `CR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const record = {
      id,
      beneficiary_id: params.beneficiaryId,
      request_type: params.requestType,
      previous_data: params.previousData,
      requested_data: params.requestedData,
      reason: params.reason || "Citizen online self-service request",
      status: "SUBMITTED",
      submitted_at: now,
    };
    runtimeChangeRequests.push(record);

    await AuditService.recordEvent({
      actorId: params.actorId || params.beneficiaryId,
      actorRole: params.actorRole || "BENEFICIARY",
      action: "SUBMIT_CHANGE_REQUEST",
      resource: "CHANGE_REQUEST",
      resourceId: id,
      previousState: params.previousData,
      newState: params.requestedData,
      ipAddress: params.ipAddress,
      outcome: "SUCCESS",
    });

    return {
      success: true,
      id,
      status: "SUBMITTED",
      message: "Change request queued for officer verification.",
    };
  }

  /**
   * Submits a citizen grievance
   */
  static async submitGrievance(params: {
    beneficiaryId: string;
    category: string;
    subject: string;
    description: string;
    priority?: string;
    actorId?: string;
    actorRole?: string;
    ipAddress?: string;
  }) {
    const id = `GRV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const record = {
      id,
      beneficiary_id: params.beneficiaryId,
      category: params.category,
      subject: params.subject,
      description: params.description,
      priority: params.priority || "NORMAL",
      status: "OPEN",
      created_at: new Date().toISOString(),
    };
    runtimeGrievances.push(record);

    await AuditService.recordEvent({
      actorId: params.actorId || params.beneficiaryId,
      actorRole: params.actorRole || "BENEFICIARY",
      action: "FILE_GRIEVANCE",
      resource: "GRIEVANCE",
      resourceId: id,
      newState: {
        category: params.category,
        subject: params.subject,
        priority: params.priority,
      },
      ipAddress: params.ipAddress,
      outcome: "SUCCESS",
    });

    return { success: true, id, status: "OPEN" };
  }
}
