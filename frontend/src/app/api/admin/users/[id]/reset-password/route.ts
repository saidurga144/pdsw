import { NextResponse } from 'next/server';
import { withAuth, getClientIp } from '@/server/middleware/auth.middleware';
import { ServerAdminService, ProvisionError } from '@/server/services/admin.service';

export const POST = withAuth(
  async (req, { user, params }) => {
    const ipAddress = getClientIp(req);
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.cookies.get('pds_token')?.value;
    const resolvedParams = await params;
    const userId = resolvedParams?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required.' }, { status: 400 });
    }

    try {
      const result = await ServerAdminService.sendPasswordReset(userId, user.userId, token, ipAddress);
      return NextResponse.json({ success: true, ...result });
    } catch (err) {
      const message = err instanceof ProvisionError ? err.message : 'Failed to generate password reset token.';
      const status = err instanceof ProvisionError ? err.status : 500;
      return NextResponse.json({ success: false, error: message }, { status });
    }
  },
  { requiredRoles: ['ADMIN'] }
);
