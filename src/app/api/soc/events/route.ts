import { NextResponse } from 'next/server';
import { withAuth } from '@/server/middleware/auth.middleware';
import { SocService } from '@/server/services/soc.service';

export const GET = withAuth(
  async (req) => {
    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const eventType = searchParams.get('eventType') || undefined;

    const events = await SocService.getSecurityEvents({ limit, eventType });
    return NextResponse.json({ success: true, events });
  },
  { requiredRoles: ['SOC', 'ADMIN', 'SOC'] }
);
