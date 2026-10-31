import { AuditService } from "@/server/services/audit.service";
import { AIAnomalyService } from "@/server/services/ai-anomaly.service";

const FASTAPI_URL = (
  process.env.FASTAPI_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://127.0.0.1:8002"
).replace("localhost", "127.0.0.1");

function authHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

// In-memory for non-critical data (distributions/change requests still use runtime state)
const runtimeDistributions: any[] = [];

export class ServerOfficerService {
  /**
   * Retrieves all BENEFICIARY accounts from the Python backend (MongoDB/SQLite).
   * Requires a valid officer Bearer token.
   */
  static async getBeneficiaries(token?: string) {
    const res = await fetch(`${FASTAPI_URL}/api/auth/officer/beneficiaries`, {
      method: "GET",
      headers: authHeaders(token),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || !Array.isArray(data.beneficiaries)) {
      throw new Error(
        data.detail ||
          data.error ||
          `Unable to load beneficiaries (HTTP ${res.status}).`,
      );
    }

    return data.beneficiaries.map((u: any) => ({
      id: u._id || u.id,
      rationCardId:
        u.ration_card_number ||
        `RC-${String(u._id || u.id)
          .slice(-6)
          .toUpperCase()}`,
      fullName: u.full_name || u.name || u.email,
      email: u.email,
      phone: u.phone || "",
      address: {
        doorNo: "",
        street: "",
        district: u.jurisdiction || "",
        state: "",
        pincode: "",
        pdsCenterId: "",
        pdsCenterName: u.jurisdiction || "",
      },
      rationCategory: (u.card_category || "PHH") as any,
      familyCount: 1,
      familyMembers: [],
      verificationStatus: (String(u.status || "ACTIVE").toUpperCase() ===
      "ACTIVE"
        ? "VERIFIED"
        : "VERIFICATION_PENDING") as any,
      riskScore: 5,
      riskLevel: "LOW" as const,
      currentHash: "0x000",
      latestIPFSCid: "",
      createdAt: u.created_at || new Date().toISOString(),
      updatedAt: u.updated_at || new Date().toISOString(),
      status:
        String(u.status || "ACTIVE").toUpperCase() === "DEACTIVATED"
          ? "INACTIVE"
          : String(u.status || "ACTIVE").toUpperCase(),
      eligibility: {
        beneficiaryId: u._id || u.id,
        category: (u.card_category || "PHH") as any,
        monthlyEntitlements: [],
        monthlyIncome: 0,
        isBPL: true,
        lastReviewedAt: new Date().toISOString(),
        nextReviewDue: new Date().toISOString(),
        status: "ELIGIBLE" as const,
      },
    }));
  }

  /**
   * Creates a new BENEFICIARY user account via the Python backend.
   * Password is bcrypt-hashed server-side — never stored as plaintext.
   */
  static async createBeneficiary(
    data: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      jurisdiction?: string;
      walletAddress?: string;
      rationCardNumber?: string;
      cardCategory?: string;
    },
    officerId: string,
    ipAddress?: string,
    token?: string,
  ) {
    if (!token) {
      throw new Error(
        "Officer session token missing. Please log out and log in again.",
      );
    }

    const res = await fetch(
      `${FASTAPI_URL}/api/auth/officer/create-beneficiary`,
      {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          password: data.password,
          full_name: data.fullName.trim(),
          phone: data.phone || null,
          jurisdiction: data.jurisdiction || null,
          wallet_address: data.walletAddress || null,
          ration_card_number: data.rationCardNumber || null,
          card_category: data.cardCategory || null,
        }),
      },
    );

    const responseData = await res.json().catch(() => ({}));

    if (!res.ok) {
      const detail =
        (typeof responseData.detail === "string" && responseData.detail) ||
        (Array.isArray(responseData.detail) &&
          responseData.detail.map((d: any) => d.msg).join("; ")) ||
        responseData.error ||
        `Failed to create beneficiary account (HTTP ${res.status}).`;
      throw new Error(detail);
    }

    await AuditService.recordEvent({
      actorId: officerId,
      actorRole: "PDS_OFFICER",
      action: "ENROLL_BENEFICIARY",
      resource: "BENEFICIARY",
      resourceId: responseData._id || responseData.id || data.email,
      newState: {
        email: data.email,
        fullName: data.fullName,
        role: "BENEFICIARY",
      },
      ipAddress,
      outcome: "SUCCESS",
    });

    return {
      id: responseData._id || responseData.id,
      email: responseData.email,
      fullName: responseData.full_name || responseData.name,
      status: responseData.status,
      message: "Beneficiary account created and persisted in the database.",
    };
  }

  /**
   * Executes a commodity distribution transaction with AI risk scan,
   * SHA-256 state hash, and IPFS audit trail.
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
    const crypto = await import("crypto");
    const distId = `txn-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const transactionCode = `TXN-PDS-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const now = new Date().toISOString();

    const aiAssessment = await AIAnomalyService.evaluateDistribution({
      beneficiaryId: params.beneficiaryId,
      riceQty: params.riceQty,
      wheatQty: params.wheatQty,
      sugarQty: params.sugarQty,
      keroseneQty: params.keroseneQty,
      fpsShopId: params.fpsShopId,
      authMode: params.authMode,
    });

    const { HashingService } =
      await import("@/server/security/hashing.service");
    const { IPFSService } = await import("@/server/security/ipfs.service");

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
      entityType: "DISTRIBUTION",
      hashAlgorithm: "SHA-256",
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
      status: "COMPLETED",
      distributed_at: now,
    };
    runtimeDistributions.unshift(record);

    await AuditService.recordEvent({
      actorId: params.officerId,
      actorRole: "OFFICER",
      action: "DISTRIBUTE_COMMODITIES",
      resource: "DISTRIBUTION",
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
      outcome:
        aiAssessment.riskLevel === "CRITICAL" ? "ANOMALY_DETECTED" : "SUCCESS",
    });

    return {
      id: distId,
      transactionCode,
      stateHash,
      ipfsCid,
      aiAssessment,
      status: "COMPLETED",
      message: "Commodity distribution verified and recorded on ledger.",
    };
  }

  /**
   * Updates a BENEFICIARY account (officer can only edit BENEFICIARY role users).
   */
  static async updateBeneficiary(
    userId: string,
    data: {
      fullName?: string;
      phone?: string;
      jurisdiction?: string;
      cardCategory?: string;
    },
    officerId: string,
    ipAddress?: string,
    token?: string,
  ) {
    if (!token) throw new Error("Officer session token missing.");

    // Fetch user to verify they are BENEFICIARY before updating
    const checkRes = await fetch(`${FASTAPI_URL}/api/auth/users`, {
      method: "GET",
      headers: authHeaders(token),
      cache: "no-store",
    });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      const target = (checkData.users || []).find(
        (u: any) => (u._id || u.id) === userId,
      );
      if (target && String(target.role || "").toUpperCase() !== "BENEFICIARY") {
        throw new Error("PDS Officer can only edit BENEFICIARY accounts.");
      }
    }

    const res = await fetch(
      `${FASTAPI_URL}/api/auth/officer/beneficiaries/${encodeURIComponent(userId)}`,
      {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify({
          full_name: data.fullName,
          phone: data.phone || null,
          jurisdiction: data.jurisdiction || null,
          card_category: data.cardCategory || null,
        }),
      },
    );

    const responseData = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (typeof responseData.detail === "string" && responseData.detail) ||
          responseData.error ||
          `Failed to update beneficiary (HTTP ${res.status}).`,
      );
    }

    await AuditService.recordEvent({
      actorId: officerId,
      actorRole: "PDS_OFFICER",
      action: "UPDATE_BENEFICIARY",
      resource: "BENEFICIARY",
      resourceId: userId,
      newState: data,
      ipAddress,
      outcome: "SUCCESS",
    });

    return responseData;
  }

  /**
   * Deactivates a BENEFICIARY account. Officer can only deactivate BENEFICIARY role.
   * Uses the same deactivation endpoint as Admin but backend enforces BENEFICIARY-only for PDS_OFFICER.
   */
  static async deleteBeneficiary(
    userId: string,
    officerId: string,
    ipAddress?: string,
    token?: string,
  ) {
    if (!token) throw new Error("Officer session token missing.");

    const res = await fetch(
      `${FASTAPI_URL}/api/auth/officer/beneficiaries/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers: authHeaders(token),
      },
    );

    const responseData = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (typeof responseData.detail === "string" && responseData.detail) ||
          responseData.error ||
          `Failed to deactivate beneficiary (HTTP ${res.status}).`,
      );
    }

    await AuditService.recordEvent({
      actorId: officerId,
      actorRole: "PDS_OFFICER",
      action: "DEACTIVATE_BENEFICIARY",
      resource: "BENEFICIARY",
      resourceId: userId,
      ipAddress,
      outcome: "SUCCESS",
    });

    return responseData;
  }

  static async updateBeneficiaryStatus(
    userId: string,
    accountStatus: "ACTIVE" | "INACTIVE",
    officerId: string,
    ipAddress?: string,
    token?: string,
  ) {
    if (!token) throw new Error("Officer session token missing.");

    const action = accountStatus === "ACTIVE" ? "activate" : "deactivate";
    const res = await fetch(
      `${FASTAPI_URL}/api/auth/officer/beneficiaries/${encodeURIComponent(userId)}/${action}`,
      {
        method: "PATCH",
        headers: authHeaders(token),
      },
    );

    const responseData = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (typeof responseData.detail === "string" && responseData.detail) ||
          responseData.error ||
          `Failed to ${action} beneficiary (HTTP ${res.status}).`,
      );
    }

    await AuditService.recordEvent({
      actorId: officerId,
      actorRole: "PDS_OFFICER",
      action:
        accountStatus === "ACTIVE"
          ? "BENEFICIARY_ACTIVATED"
          : "BENEFICIARY_DEACTIVATED",
      resource: "BENEFICIARY",
      resourceId: userId,
      newState: { status: accountStatus },
      ipAddress,
      outcome: "SUCCESS",
    });

    return responseData;
  }

  /**
   * Generates a one-time password reset token for a BENEFICIARY.
   * Officer can only reset BENEFICIARY passwords, not Admin/Officer/SOC.
   */
  static async resetBeneficiaryPassword(
    userId: string,
    officerId: string,
    ipAddress?: string,
    token?: string,
  ) {
    if (!token) throw new Error("Officer session token missing.");

    const res = await fetch(
      `${FASTAPI_URL}/api/auth/officer/beneficiaries/${encodeURIComponent(userId)}/reset-password`,
      {
        method: "POST",
        headers: authHeaders(token),
      },
    );

    const responseData = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (typeof responseData.detail === "string" && responseData.detail) ||
          responseData.error ||
          `Failed to reset password (HTTP ${res.status}).`,
      );
    }

    await AuditService.recordEvent({
      actorId: officerId,
      actorRole: "PDS_OFFICER",
      action: "RESET_BENEFICIARY_PASSWORD",
      resource: "BENEFICIARY",
      resourceId: userId,
      ipAddress,
      outcome: "SUCCESS",
    });

    return responseData;
  }

}
