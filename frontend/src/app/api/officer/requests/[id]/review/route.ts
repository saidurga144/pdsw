import { NextResponse } from 'next/server';
import { withAuth, getClientIp } from '@/server/middleware/auth.middleware';
import { ServerOfficerService } from '@/server/services/officer.service';

export const POST = withAuth(
  async (req, { user, params }) => {
    const ipAddress = getClientIp(req);
    const body = await req.json();
    const requestId = params?.id || body.requestId;

    const result = await ServerOfficerService.reviewChangeRequest(
      requestId,
      body.status,
      body.reviewNotes,
      user.userId,
      ipAddress
    );

    return NextResponse.json(result);
  },
  { requiredRoles: ['PDS_OFFICER', 'ADMIN'] }
);
