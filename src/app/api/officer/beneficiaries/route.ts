import { NextResponse } from 'next/server';
import { withAuth, getClientIp } from '@/server/middleware/auth.middleware';
import { ServerOfficerService } from '@/server/services/officer.service';

export const GET = withAuth(
  async (req, { user }) => {
    const search = req.nextUrl.searchParams.get('search') || undefined;
    const beneficiaries = await ServerOfficerService.getBeneficiaries(user.jurisdiction, search);
    return NextResponse.json({ success: true, beneficiaries });
  },
  { requiredRoles: ['OFFICER', 'ADMIN', 'SOC'] }
);

export const POST = withAuth(
  async (req, { user }) => {
    const ipAddress = getClientIp(req);
    const body = await req.json();

    const result = await ServerOfficerService.createBeneficiary(body, user.userId, ipAddress);
    return NextResponse.json({ success: true, ...result });
  },
  { requiredRoles: ['OFFICER', 'ADMIN'] }
);
