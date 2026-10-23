import { NextResponse } from 'next/server';
import { withAuth, getClientIp } from '@/server/middleware/auth.middleware';
import { ServerAdminService } from '@/server/services/admin.service';

export const GET = withAuth(
  async () => {
    const users = await ServerAdminService.getAllUsers();
    return NextResponse.json({ success: true, users });
  },
  { requiredRoles: ['ADMIN'] }
);

export const POST = withAuth(
  async (req, { user }) => {
    const ipAddress = getClientIp(req);
    const body = await req.json();

    const created = await ServerAdminService.createUser(body, user.userId, ipAddress);
    return NextResponse.json({ success: true, user: created });
  },
  { requiredRoles: ['ADMIN'] }
);
