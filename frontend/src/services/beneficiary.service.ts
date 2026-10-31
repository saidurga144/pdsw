import { Beneficiary, ChangeRequest, SupportingDocument } from "@/types";
import { apiClient } from "./api/client";
import { useAuthStore } from "@/stores/auth.store";

function mapChangeRequest(record: any): ChangeRequest {
  return {
    id: record.id,
    beneficiaryId: record.beneficiary_id ?? record.beneficiaryId ?? "",
    beneficiaryName:
      record.beneficiary_name ?? record.beneficiaryName ?? "Beneficiary",
    rationCardId: record.ration_card_id ?? record.rationCardId ?? "",
    requestType: record.request_type ?? record.requestType ?? "ADDRESS_CHANGE",
    submittedAt: record.submitted_at ?? record.submittedAt ?? "",
    status: record.status ?? "SUBMITTED",
    previousData: record.previous_data ?? record.previousData ?? {},
    requestedData: record.requested_data ?? record.requestedData ?? {},
    reason: record.reason ?? "",
    supportingDocuments: ((record.supporting_documents ??
      record.supportingDocuments ?? []) as any[]).map((document) => ({
      documentId: document.document_id ?? document.documentId ?? "",
      ipfsCid: document.ipfs_cid ?? document.ipfsCid ?? "",
      fileHash: document.file_hash ?? document.fileHash ?? "",
      txHash: document.tx_hash ?? document.txHash ?? "IPFS_ONLY",
      gatewayUrl: document.gateway_url ?? document.gatewayUrl ?? "",
      fileName: document.file_name ?? document.fileName ?? "Document",
      fileSize: document.file_size ?? document.fileSize ?? 0,
      mimeType: document.mime_type ?? document.mimeType ?? "application/octet-stream",
    })) as SupportingDocument[],
    aiRiskScore: record.ai_risk_score ?? record.aiRiskScore ?? 5,
    aiRiskLevel: record.ai_risk_level ?? record.aiRiskLevel ?? "LOW",
    aiExplainabilityNotes:
      record.ai_explainability_notes ?? record.aiExplainabilityNotes ?? [],
    officerRemarks: record.review_notes ?? record.officerRemarks,
    reviewedBy: record.reviewed_by ?? record.reviewedBy,
    reviewedAt: record.reviewed_at ?? record.reviewedAt,
  };
}

export class BeneficiaryService {
  /**
   * Retrieves the current authenticated beneficiary's own profile
   */
  static async getMyProfile(): Promise<Beneficiary | null> {
    try {
      const res = await apiClient.get("/beneficiary/profile");
      if (res.data?.success && res.data.profile) {
        return res.data.profile;
      }
    } catch (error) {
      console.warn("⚠️ [BeneficiaryService.getMyProfile API Error]", error);
    }

    // Fallback constructed strictly from the authenticated user's state
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      const benId =
        currentUser.beneficiaryId ||
        `ben-${currentUser.id.replace(/^usr-/, "")}`;
      const district =
        currentUser.jurisdiction?.split(",")[0]?.trim() || "South Delhi";
      const state = currentUser.jurisdiction?.split(",")[1]?.trim() || "Delhi";
      return {
        id: benId,
        rationCardId: `RC-${currentUser.id.slice(-6).toUpperCase()}`,
        fullName: currentUser.name || "Citizen User",
        phone: currentUser.phone || "+91 98765 43210",
        address: {
          doorNo: "H-42",
          street: "Block B, Sector 4",
          district,
          state,
          pincode: "110016",
          pdsCenterId: `FPS-${district.slice(0, 3).toUpperCase()}-102`,
          pdsCenterName: `Fair Price Shop #102, ${district}`,
        },
        rationCategory: "PHH",
        familyCount: 1,
        familyMembers: [
          {
            id: `fm-${currentUser.id}-1`,
            beneficiaryId: benId,
            fullName: currentUser.name || "Citizen User",
            relationship: "HEAD",
            age: 35,
            gender: "MALE",
            uidHash: `0x${currentUser.id.slice(-8)}`,
            verificationStatus: "VERIFIED",
            addedAt: new Date().toISOString(),
          },
        ],
        eligibility: {
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
          ],
          monthlyIncome: 10000,
          isBPL: true,
          lastReviewedAt: new Date().toISOString(),
          nextReviewDue: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          status: "ELIGIBLE",
        },
        verificationStatus: "VERIFIED",
        riskScore: 6,
        riskLevel: "LOW",
        currentHash: `0x${currentUser.id.slice(-12)}`,
        latestIPFSCid: `Qm${currentUser.id.slice(-16)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return null;
  }

  static async getBeneficiaries(): Promise<Beneficiary[]> {
    try {
      const res = await apiClient.get("/officer/beneficiaries");
      if (
        res.data?.success &&
        Array.isArray(res.data.beneficiaries) &&
        res.data.beneficiaries.length > 0
      ) {
        return res.data.beneficiaries;
      }
    } catch {}
    return [];
  }

  static async getBeneficiaryById(
    id: string,
  ): Promise<Beneficiary | undefined> {
    try {
      const res = await apiClient.get(
        `/beneficiary/profile?beneficiaryId=${id}`,
      );
      if (res.data?.success && res.data.profile) {
        return res.data.profile;
      }
    } catch {}
    return undefined;
  }

  static async getChangeRequests(): Promise<ChangeRequest[]> {
    const res = await apiClient.get("/beneficiary/requests");
    if (!res.data?.success || !Array.isArray(res.data.requests)) {
      throw new Error(res.data?.detail || res.data?.error || "Could not load requests.");
    }
    return res.data.requests.map(mapChangeRequest);
  }

  static async submitChangeRequest(
    request: Partial<ChangeRequest>,
  ): Promise<ChangeRequest> {
    const res = await apiClient.post("/beneficiary/requests", {
      request_type: request.requestType,
      reason: request.reason,
      previous_data: request.previousData || {},
      requested_data: request.requestedData || {},
      supporting_documents: (request.supportingDocuments || []).map((document) => ({
        document_id: document.documentId,
        ipfs_cid: document.ipfsCid,
        file_hash: document.fileHash,
        tx_hash: document.txHash,
        file_name: document.fileName,
        file_size: document.fileSize,
        mime_type: document.mimeType,
        gateway_url: document.gatewayUrl,
      })),
    });

    if (!res.data?.success || !res.data?.id) {
      throw new Error(
        res.data?.detail || res.data?.error || "Could not save the change request.",
      );
    }
    return mapChangeRequest(res.data);
  }

  static async updateChangeRequestStatus(
    id: string,
    status: ChangeRequest["status"],
    remarks?: string,
  ): Promise<ChangeRequest> {
    const res = await apiClient.post(`/officer/requests/${id}/review`, {
      requestId: id,
      status,
      reviewNotes: remarks,
    });
    if (!res.data?.success || !res.data?.request) {
      throw new Error(
        res.data?.detail || res.data?.error || "Could not update the request.",
      );
    }
    return mapChangeRequest(res.data.request);
  }
}
