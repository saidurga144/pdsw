export type CanonicalRole = 'BENEFICIARY' | 'PDS_OFFICER' | 'ADMIN' | 'SOC_ANALYST';

export interface RoleOption {
  value: CanonicalRole;
  label: string;
  dashboardPath: string;
  description: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'BENEFICIARY',
    label: 'Beneficiary',
    dashboardPath: '/beneficiary/dashboard',
    description: 'Citizen ration cards & welfare entitlements',
  },
  {
    value: 'PDS_OFFICER',
    label: 'PDS Officer',
    dashboardPath: '/officer/dashboard',
    description: 'Inspector operations & commodity distribution',
  },
  {
    value: 'ADMIN',
    label: 'Administrator',
    dashboardPath: '/admin/dashboard',
    description: 'Central HQ system management & user directory',
  },
  {
    value: 'SOC_ANALYST',
    label: 'Security Analyst',
    dashboardPath: '/soc/dashboard',
    description: 'CERT-In SOC cyber threat monitoring',
  },
];

export function normalizeRole(role: string): CanonicalRole {
  const upper = (role || '').trim().toUpperCase().replace(/[-\s]/g, '_');
  if (upper === 'PDS_OFFICER' || upper === 'OFFICER') return 'PDS_OFFICER';
  if (upper === 'ADMINISTRATOR' || upper === 'ADMIN') return 'ADMIN';
  if (upper === 'SECURITY_ANALYST' || upper === 'SOC_ANALYST' || upper === 'SOC') return 'SOC_ANALYST';
  return 'BENEFICIARY';
}

export function getRoleDashboard(role: string): string {
  const canonical = normalizeRole(role);
  const found = ROLE_OPTIONS.find((r) => r.value === canonical);
  return found?.dashboardPath || '/beneficiary/dashboard';
}

export function getRoleLabel(role: string): string {
  const canonical = normalizeRole(role);
  const found = ROLE_OPTIONS.find((r) => r.value === canonical);
  return found?.label || 'Beneficiary';
}
