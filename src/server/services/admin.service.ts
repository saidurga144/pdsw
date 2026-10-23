import { AuditService } from '@/server/services/audit.service';
import { Role, User } from '@/types';
import { MOCK_USERS } from '@/mock-data/pds-data';

// In-memory runtime users registry
let runtimeUsers: any[] = [...MOCK_USERS];

export class ServerAdminService {
  /**
   * Retrieves all registered system users across all 5 roles
   */
  static async getAllUsers() {
    return runtimeUsers;
  }

  /**
   * Creates a new user
   */
  static async createUser(
    userData: {
      email: string;
      role: Role;
      fullName: string;
      phone?: string;
      jurisdiction?: string;
    },
    adminId: string,
    ipAddress?: string
  ) {
    const id = `usr-${userData.role.toLowerCase()}-${Date.now()}`;
    const now = new Date().toISOString();

    const newUser = {
      id,
      email: userData.email,
      role: userData.role,
      fullName: userData.fullName,
      full_name: userData.fullName,
      phone: userData.phone || '+91 98000 00000',
      jurisdiction: userData.jurisdiction || 'All Districts',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    };

    runtimeUsers.unshift(newUser);

    await AuditService.recordEvent({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: 'CREATE_USER',
      resource: 'USER',
      resourceId: id,
      newState: { email: userData.email, role: userData.role, fullName: userData.fullName },
      ipAddress,
      outcome: 'SUCCESS',
    });

    return { id, email: userData.email, role: userData.role, fullName: userData.fullName, status: 'ACTIVE' };
  }

  /**
   * Updates user operational status (ACTIVE / SUSPENDED / DEACTIVATED)
   */
  static async updateUserStatus(userId: string, status: string, adminId: string, ipAddress?: string) {
    const userIndex = runtimeUsers.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      runtimeUsers[userIndex] = {
        ...runtimeUsers[userIndex],
        status,
        updated_at: new Date().toISOString(),
      };
    }

    await AuditService.recordEvent({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: 'UPDATE_USER_STATUS',
      resource: 'USER',
      resourceId: userId,
      newState: { status },
      ipAddress,
      outcome: 'SUCCESS',
    });

    return { success: true, message: `User status set to ${status}.` };
  }

  /**
   * Retrieves platform-wide KPIs
   */
  static async getPlatformStats() {
    return {
      totalUsers: runtimeUsers.length,
      totalBeneficiaries: 1450000,
      totalDistributions: 8920,
      totalAuditEvents: 14200,
    };
  }
}
