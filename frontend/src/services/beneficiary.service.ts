import { Beneficiary, ChangeRequest, SupportingDocument } from "@/types";
import { apiClient } from "./api/client";

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
    ...(record.ai_risk_score != null || record.aiRiskScore != null ? { aiRiskScore: record.ai_risk_score ?? record.aiRiskScore } : {}),
    ...(record.ai_risk_level || record.aiRiskLevel ? { aiRiskLevel: record.ai_risk_level ?? record.aiRiskLevel } : {}),
    ...(record.ai_explainability_notes || record.aiExplainabilityNotes ? { aiExplainabilityNotes: record.ai_explainability_notes ?? record.aiExplainabilityNotes } : {}),
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
    const res = await apiClient.get("/beneficiary/profile");
    if (res.data?.success && res.data.profile) return res.data.profile;
    return null;
  }

  static async getBeneficiaries(): Promise<Beneficiary[]> {
    const res = await apiClient.get("/officer/beneficiaries");
    if (res.data?.success && Array.isArray(res.data.beneficiaries)) {
      return res.data.beneficiaries;
    }
    throw new Error(res.data?.error || "Could not load beneficiary records.");
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
    remarks: string,
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

  static async withdrawChangeRequest(id: string): Promise<ChangeRequest> {
    const res = await apiClient.patch(
      `/beneficiary/requests/${encodeURIComponent(id)}/withdraw`,
    );
    if (!res.data?.success || !res.data?.request) {
      throw new Error(
        res.data?.detail || res.data?.error || "Could not withdraw the request.",
      );
    }
    return mapChangeRequest(res.data.request);
  }
}
