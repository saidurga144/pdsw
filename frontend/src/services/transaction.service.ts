import { Distribution } from "@/types";
import { apiClient } from "./api/client";

export class TransactionService {
  static async getDistributions(): Promise<Distribution[]> {
    const response = await apiClient.get("/beneficiary/transactions");
    if (!response.data?.success || !Array.isArray(response.data.transactions)) {
      throw new Error(response.data?.detail || response.data?.error || "Could not load distribution receipts.");
    }
    return response.data.transactions;
  }

  static async createDistribution(data: Partial<Distribution>): Promise<Distribution> {
    const lines = (data.commodities || [])
      .filter((item) => Number(item.quantity) > 0)
      .map((item) => ({ commodity: item.name, quantity: Number(item.quantity) }));
    if (!data.beneficiaryId || !data.pdsCenterId || lines.length === 0) {
      throw new Error("Select a configured beneficiary, fair price shop, and at least one commodity quantity.");
    }
    const response = await apiClient.post("/officer/distribution", {
      beneficiary_id: data.beneficiaryId,
      fps_shop_id: data.pdsCenterId,
      idempotency_key: globalThis.crypto.randomUUID(),
      auth_mode: data.verificationMethod || "OFFICER_VERIFIED",
      commodities: lines,
    });
    if (!response.data?.success || !response.data?.id) {
      throw new Error(response.data?.detail || response.data?.error || "Distribution was not recorded.");
    }
    return {
      id: response.data.id,
      transactionId: response.data.transactionCode,
      beneficiaryId: data.beneficiaryId,
      beneficiaryName: data.beneficiaryName || "",
      rationCardId: data.rationCardId || "",
      pdsCenterId: data.pdsCenterId,
      officerId: data.officerId || "",
      commodities: response.data.commodities || data.commodities || [],
      totalAmount: response.data.totalCost,
      timestamp: response.data.distributedAt || new Date().toISOString(),
      status: "COMPLETED",
      verificationMethod: data.verificationMethod || "OFFICER_VERIFIED",
      receiptHash: response.data.stateHash,
      ipfsCid: response.data.ipfsCid || "",
    };
  }
}
