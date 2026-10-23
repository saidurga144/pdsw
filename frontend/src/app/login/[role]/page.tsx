'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Role } from '@/types';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';
import { getRoleLabel, normalizeRole } from '@/lib/role-utils';

export default function RoleLoginPage() {
  const params = useParams();
  const rawRole = (params?.role as string) || '';

  const roleMap: Record<string, Role> = {
    beneficiary: 'BENEFICIARY',
    officer: 'PDS_OFFICER',
    'pds-officer': 'PDS_OFFICER',
    admin: 'ADMIN',
    soc: 'SOC_ANALYST',
    'soc-analyst': 'SOC_ANALYST',
    'security-analyst': 'SOC_ANALYST',
  };

  const selectedRole: Role = roleMap[rawRole.toLowerCase()] || normalizeRole(rawRole.toUpperCase());
  const roleLabel = getRoleLabel(selectedRole);

  return (
    <div className="py-6 px-4">
      <AuthLayout
        title={`${roleLabel} Portal Login`}
        subtitle={`Enter authorized credentials to access the ${roleLabel.toLowerCase()} workspace`}
      >
        <LoginForm initialRole={selectedRole} />
      </AuthLayout>
    </div>
  );
}
