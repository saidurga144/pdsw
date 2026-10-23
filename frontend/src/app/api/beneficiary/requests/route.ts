import { NextResponse } from 'next/server';
import { withAuth, getClientIp } from '@/server/middleware/auth.middleware';
import { ServerBeneficiaryService } from '@/server/services/beneficiary.service';

export const POST = withAuth(
  async (req, { user }) => {
    const ipAddress = getClientIp(req);
    const body = await req.json();
    const { beneficiaryId, requestType, previousData, requestedData } = body;

    const result = await ServerBeneficiaryService.submitChangeRequest({
      beneficiaryId: beneficiaryId || 'ben-001',
      requestType,
      previousData,
      requestedData,
      actorId: user.userId,
      actorRole: user.role,
      ipAddress,
    });

    return NextResponse.json(result);
  },
  { requiredRoles: ['BENEFICIARY', 'PDS_OFFICER', 'ADMIN'] }
);
