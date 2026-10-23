import { NextResponse } from 'next/server';
import { withAuth, getClientIp } from '@/server/middleware/auth.middleware';
import { ServerOfficerService } from '@/server/services/officer.service';

/** POST /api/officer/beneficiaries/[id]/reset-password */
export const POST = withAuth(
  async (req, { user, params }) => {
    const id = params?.id as string;
    if (!id) return NextResponse.json({ success: false, error: 'Beneficiary ID is required.' }, { status: 400 });

    const token =
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      req.cookies.get('pds_token')?.value;
    const ipAddress = getClientIp(req);

    try {
      const result = await ServerOfficerService.resetBeneficiaryPassword(id, user.userId, ipAddress, token);
      return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || 'Failed to reset beneficiary password.' },
        { status: 400 }
      );
    }
  },
  { requiredRoles: ['PDS_OFFICER', 'ADMIN'] }
);
