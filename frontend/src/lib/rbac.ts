// src/lib/rbac.ts

/**
 * Role‑Based Access Control (RBAC) core definitions.
 *
 * This file defines the permission model used across the application.
 * It is deliberately lightweight (in‑memory) for the mock implementation,
 * but the shape mirrors a production‑grade system.
 */

import { Role } from '@/types';

/** Application modules (high‑level functional areas) */
export enum Module {
  BENEFICIARY = 'BENEFICIARY',
  FAMILY = 'FAMILY',
  ELIGIBILITY = 'ELIGIBILITY',
  DISTRIBUTION = 'DISTRIBUTION',
  USERS = 'USERS',
  ROLES = 'ROLES',
  AI_RISK = 'AI_RISK',
  INTEGRITY = 'INTEGRITY',
  SECURITY = 'SECURITY',
  AUDIT = 'AUDIT',
  SETTINGS = 'SETTINGS',
}

/** CRUD‑style actions plus special verbs */
export enum Action {
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  MODIFY = 'MODIFY',
  DELETE = 'DELETE',
  VERIFY = 'VERIFY',
  APPROVE = 'APPROVE',
}

/** Permission descriptor for a single module */
export type Permission = {
  module: Module;
  actions: Action[];
};

/** Permission matrix for each role. */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  BENEFICIARY: [
    { module: Module.BENEFICIARY, actions: [Action.VIEW, Action.CREATE] },
    { module: Module.FAMILY, actions: [Action.VIEW, Action.CREATE, Action.MODIFY] },
    { module: Module.ELIGIBILITY, actions: [Action.VIEW] },
    { module: Module.DISTRIBUTION, actions: [Action.VIEW] },
    { module: Module.AI_RISK, actions: [Action.VIEW] },
    { module: Module.AUDIT, actions: [Action.VIEW] },
    { module: Module.SECURITY, actions: [Action.VIEW] },
  ],
  PDS_OFFICER: [
    { module: Module.BENEFICIARY, actions: [Action.VIEW, Action.MODIFY] },
    { module: Module.FAMILY, actions: [Action.VIEW, Action.CREATE, Action.MODIFY, Action.DELETE] },
    { module: Module.ELIGIBILITY, actions: [Action.VIEW, Action.MODIFY, Action.APPROVE] },
    { module: Module.DISTRIBUTION, actions: [Action.VIEW, Action.CREATE] },
    { module: Module.AI_RISK, actions: [Action.VIEW] },
    { module: Module.AUDIT, actions: [Action.VIEW] },
    { module: Module.SECURITY, actions: [Action.VIEW] },
  ],
  ADMIN: [
    { module: Module.USERS, actions: [Action.VIEW, Action.CREATE, Action.MODIFY, Action.DELETE] },
    { module: Module.ROLES, actions: [Action.VIEW, Action.CREATE, Action.MODIFY, Action.DELETE] },
    { module: Module.SETTINGS, actions: [Action.VIEW, Action.MODIFY] },
    { module: Module.INTEGRITY, actions: [Action.VIEW, Action.CREATE] },
    { module: Module.AI_RISK, actions: [Action.VIEW, Action.MODIFY] },
    { module: Module.AUDIT, actions: [Action.VIEW] },
    { module: Module.SECURITY, actions: [Action.VIEW] },
  ],
  SOC_ANALYST: [
    { module: Module.SECURITY, actions: [Action.VIEW, Action.CREATE, Action.MODIFY] },
    { module: Module.AI_RISK, actions: [Action.VIEW] },
    { module: Module.AUDIT, actions: [Action.VIEW] },
    { module: Module.BENEFICIARY, actions: [Action.VIEW] },
    { module: Module.INTEGRITY, actions: [Action.VIEW] },
    { module: Module.DISTRIBUTION, actions: [Action.VIEW] },
  ],
};

/**
 * Helper to check whether a role possesses a given permission.
 *
 * @param role   Role of the current user.
 * @param module Application module to check.
 * @param action Desired action.
 * @returns true if the role is allowed, false otherwise.
 */
export function hasPermission(role: Role, module: Module, action: Action): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  const mod = perms.find((p) => p.module === module);
  if (!mod) return false;
  return mod.actions.includes(action);
}

export default {
  Module,
  Action,
  hasPermission,
};
