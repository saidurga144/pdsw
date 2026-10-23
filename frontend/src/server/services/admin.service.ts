import { AuditService } from '@/server/services/audit.service';
import { Role } from '@/types';
import { normalizeRole } from '@/lib/role-utils';

const FASTAPI_URL = (process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8002').replace('localhost', '127.0.0.1');

export class ProvisionError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ProvisionError';
    this.status = status;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapBackendUser(u: Record<string, unknown>) {
  const rawStatus = String(u.status || 'ACTIVE').toUpperCase();
  return {
    id: (u.id || u._id) as string,
    name: (u.full_name || u.name || u.email) as string,
    email: u.email as string,
    role: normalizeRole(String(u.role || '')),
    phone: (u.phone || '') as string,
    jurisdiction: (u.jurisdiction || '') as string,
    status: rawStatus === 'DEACTIVATED' ? 'INACTIVE' : rawStatus,
    lastLoginAt: (u.last_login_at || null) as string | null,
  };
}

export class ServerAdminService {
  /**
   * Retrieves all registered system users from the FastAPI backend (MongoDB/SQLite).
   */
  static async getAllUsers(token?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let res: Response;
    try {
      res = await fetch(`${FASTAPI_URL}/api/auth/users`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });
    } catch {
      throw new ProvisionError(
        'Unable to reach the authentication backend. Ensure the FastAPI server is running.',
        503
      );
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ProvisionError(
        data.detail || data.error || `Failed to load users (HTTP ${res.status}).`,
        res.status
      );
    }

    const data = await res.json();
    if (!data.users || !Array.isArray(data.users)) {
      return [];
    }

    return data.users.map(mapBackendUser);
  }

  /**
   * Creates a new user by persisting credentials in the FastAPI backend.
   * Does NOT report success unless the backend confirms the account was stored.
   */
  static async createUser(
    userData: {
      email: string;
      role: Role | string;
      fullName: string;
      phone?: string;
      jurisdiction?: string;
      password?: string;
    },
    adminId: string,
    ipAddress?: string,
    token?: string
  ) {
    if (!userData.password || userData.password.length < 6) {
      throw new ProvisionError('Password must be at least 6 characters.', 400);
    }

    const canonicalRole = normalizeRole(String(userData.role));
    const cleanEmail = normalizeEmail(userData.email);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      throw new ProvisionError(
        'Admin session token missing. Please log out and log in again before provisioning users.',
        401
      );
    }

    let res: Response;
    try {
      res = await fetch(`${FASTAPI_URL}/api/auth/admin/provision-user`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: cleanEmail,
          role: canonicalRole,
          full_name: userData.fullName.trim(),
          phone: userData.phone || null,
          jurisdiction: userData.jurisdiction?.trim() || null,
          password: userData.password,
        }),
      });
    } catch {
      throw new ProvisionError(
        'Unable to reach the authentication backend. Ensure the FastAPI server is running on the configured port.',
        503
      );
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const detail =
        (typeof data.detail === 'string' && data.detail) ||
        (Array.isArray(data.detail) && data.detail.map((d: { msg?: string }) => d.msg).join('; ')) ||
        data.error ||
        `User provisioning failed (HTTP ${res.status}).`;

      await AuditService.recordEvent({
        actorId: adminId,
        actorRole: 'ADMIN',
        action: 'CREATE_USER',
        resource: 'USER',
        resourceId: cleanEmail,
        newState: { email: cleanEmail, role: canonicalRole, fullName: userData.fullName },
        ipAddress,
        outcome: 'FAILURE',
      });

      throw new ProvisionError(detail, res.status);
    }

    const created = mapBackendUser(data);

    await AuditService.recordEvent({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: 'CREATE_USER',
      resource: 'USER',
      resourceId: created.id,
      newState: { email: cleanEmail, role: canonicalRole, fullName: userData.fullName },
      ipAddress,
      outcome: 'SUCCESS',
    });

    return {
      id: created.id,
      email: created.email,
      role: created.role,
      fullName: userData.fullName,
      status: created.status,
    };
  }

  /**
   * Activates or deactivates a user account through the protected FastAPI backend.
   */
  static async updateUserStatus(userId: string, status: 'ACTIVE' | 'INACTIVE', adminId: string, token?: string, ipAddress?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      throw new ProvisionError('Admin session token missing.', 401);
    }

    const action = status === 'ACTIVE' ? 'activate' : 'deactivate';
    let res: Response;
    try {
      res = await fetch(`${FASTAPI_URL}/api/auth/admin/users/${encodeURIComponent(userId)}/${action}`, {
        method: 'PATCH',
        headers,
      });
    } catch {
      throw new ProvisionError('Unable to reach backend service.', 503);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = data.detail || data.error || `Failed to ${action} user (HTTP ${res.status}).`;
      await AuditService.recordEvent({
        actorId: adminId,
        actorRole: 'ADMIN',
        action: status === 'ACTIVE' ? 'USER_ACTIVATION_FAILED' : 'USER_DEACTIVATION_FAILED',
        resource: 'USER',
        resourceId: userId,
        ipAddress,
        outcome: 'FAILURE',
      });
      throw new ProvisionError(errorMsg, res.status);
    }

    await AuditService.recordEvent({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: status === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      resource: 'USER',
      resourceId: userId,
      newState: { status },
      ipAddress,
      outcome: 'SUCCESS',
    });

    return data;
  }

  /**
   * Deactivates a user account via FastAPI backend.
   */
  static async deleteUser(userId: string, adminId: string, token?: string, ipAddress?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      throw new ProvisionError('Admin session token missing.', 401);
    }

    let res: Response;
    try {
      res = await fetch(`${FASTAPI_URL}/api/auth/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers,
      });
    } catch {
      throw new ProvisionError('Unable to reach backend service.', 503);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = data.detail || data.error || `Failed to deactivate user (HTTP ${res.status}).`;
      await AuditService.recordEvent({
        actorId: adminId,
        actorRole: 'ADMIN',
        action: 'USER_DEACTIVATION_FAILED',
        resource: 'USER',
        resourceId: userId,
        ipAddress,
        outcome: 'FAILURE',
      });
      throw new ProvisionError(errorMsg, res.status);
    }

    await AuditService.recordEvent({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: 'USER_DEACTIVATED',
      resource: 'USER',
      resourceId: userId,
      ipAddress,
      outcome: 'SUCCESS',
    });

    return data;
  }

  /**
   * Generates a password reset token for a user (Admin only).
   */
  static async sendPasswordReset(userId: string, adminId: string, token?: string, ipAddress?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      throw new ProvisionError('Admin session token missing.', 401);
    }

    let res: Response;
    try {
      res = await fetch(`${FASTAPI_URL}/api/auth/admin/users/${encodeURIComponent(userId)}/reset-password`, {
        method: 'POST',
        headers,
      });
    } catch {
      throw new ProvisionError('Unable to reach backend service.', 503);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = data.detail || data.error || `Failed to reset password (HTTP ${res.status}).`;
      throw new ProvisionError(errorMsg, res.status);
    }

    await AuditService.recordEvent({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: 'GENERATE_PASSWORD_RESET',
      resource: 'USER',
      resourceId: userId,
      ipAddress,
      outcome: 'SUCCESS',
    });

    return data;
  }

  /**
   * Retrieves platform-wide KPIs from the backend.
   */
  static async getPlatformStats(token?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${FASTAPI_URL}/api/auth/stats`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.stats) {
          return data.stats;
        }
      }
    } catch {
      // Backend unavailable
    }

    return {
      totalUsers: 0,
      admins: 0,
      pdsOfficers: 0,
      socAnalysts: 0,
      beneficiaries: 0,
      pendingRequests: 0,
      totalDistributions: 0,
      totalAuditEvents: 0,
    };
  }
}
