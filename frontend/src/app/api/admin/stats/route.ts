import { NextResponse } from 'next/server';
import { withAuth } from '@/server/middleware/auth.middleware';
import { ServerAdminService } from '@/server/services/admin.service';

export const GET = withAuth(
  async (req) => {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.cookies.get('pds_token')?.value;
    const stats = await ServerAdminService.getPlatformStats(token);
    return NextResponse.json({ success: true, stats });
  },
  { requiredRoles: ['ADMIN'] }
);
