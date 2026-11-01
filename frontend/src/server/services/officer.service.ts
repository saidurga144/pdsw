import { AuditService } from "@/server/services/audit.service";

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

export class ServerOfficerService {
  /**
   * Retrieves all BENEFICIARY accounts from the Python backend (MongoDB/SQLite).
   * Requires a valid officer Bearer token.
   */
  static async getBeneficiaries(token?: string) {
    const res = await fetch(`${FASTAPI_URL}/api/portal/officer/beneficiaries`, {
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
      id: u.id,
      rationCardId: u.rationCardId || null,
      fullName: u.fullName || "",
      email: u.email,
      phone: u.phone || "",
      address: u.address || { doorNo: "", street: "", district: "", state: "", pincode: "", pdsCenterId: "", pdsCenterName: "" },
      rationCategory: u.rationCategory || null,
      familyCount: Number(u.familyCount || 0),
      familyMembers: u.familyMembers || [],
      verificationStatus: u.verificationStatus || "PENDING",
      createdAt: u.createdAt || "",
      updatedAt: u.updatedAt || "",
      status: String(u.status || "ACTIVE").toUpperCase(),
      eligibility: u.eligibility,
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
      addressData?: Record<string, string>;
      monthlyIncome?: number | null;
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
          address_data: data.addressData || null,
          monthly_income: data.monthlyIncome ?? null,
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
      const error = new Error(detail) as Error & { status?: number };
      error.status = res.status;
      throw error;
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
   * Updates a BENEFICIARY account (officer can only edit BENEFICIARY role users).
   */
  static async updateBeneficiary(
    userId: string,
    data: {
      fullName?: string;
      phone?: string;
      jurisdiction?: string;
      cardCategory?: string;
      rationCardNumber?: string | null;
      addressData?: Record<string, string>;
      monthlyIncome?: number | null;
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
          ration_card_number: data.rationCardNumber ?? null,
          address_data: data.addressData,
          monthly_income: data.monthlyIncome ?? null,
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
