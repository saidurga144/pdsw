import { NextResponse } from 'next/server';
import { withAuth, getClientIp } from '@/server/middleware/auth.middleware';
import { ServerAdminService, ProvisionError } from '@/server/services/admin.service';

export const GET = withAuth(
  async (req) => {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.cookies.get('pds_token')?.value;
    try {
      const users = await ServerAdminService.getAllUsers(token);
      return NextResponse.json({ success: true, users });
    } catch (err) {
      const message = err instanceof ProvisionError ? err.message : 'Failed to load user accounts.';
      const status = err instanceof ProvisionError ? err.status : 500;
      return NextResponse.json({ success: false, error: message }, { status });
    }
  },
  { requiredRoles: ['ADMIN'] }
);

export const POST = withAuth(
  async (req, { user }) => {
    const ipAddress = getClientIp(req);
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.cookies.get('pds_token')?.value;
    const body = await req.json();

    try {
      const created = await ServerAdminService.createUser(body, user.userId, ipAddress, token);
      return NextResponse.json({ success: true, user: created }, { status: 201 });
    } catch (err) {
      const message = err instanceof ProvisionError ? err.message : 'Failed to provision user account.';
      const status = err instanceof ProvisionError ? err.status : 500;
      return NextResponse.json({ success: false, error: message }, { status });
    }
  },
  { requiredRoles: ['ADMIN'] }
);
