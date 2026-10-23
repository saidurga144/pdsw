import { NextResponse } from 'next/server';
import { withAuth } from '@/server/middleware/auth.middleware';
import { SocService } from '@/server/services/soc.service';

export const GET = withAuth(
  async () => {
    const stats = await SocService.getTelemetryStats();
    return NextResponse.json({ success: true, stats });
  },
  { requiredRoles: ['SOC_ANALYST', 'ADMIN'] }
);
