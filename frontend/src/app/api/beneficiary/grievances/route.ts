import { NextResponse } from 'next/server';
import { withAuth, getClientIp } from '@/server/middleware/auth.middleware';
import { ServerBeneficiaryService } from '@/server/services/beneficiary.service';

export const POST = withAuth(
  async (req, { user }) => {
    const ipAddress = getClientIp(req);
    const body = await req.json();
    const { beneficiaryId, category, subject, description, priority } = body;

    const result = await ServerBeneficiaryService.submitGrievance({
      beneficiaryId: beneficiaryId || 'ben-001',
      category,
      subject,
      description,
      priority,
      actorId: user.userId,
      actorRole: user.role,
      ipAddress,
    });

    return NextResponse.json(result);
  },
  { requiredRoles: ['BENEFICIARY', 'PDS_OFFICER', 'ADMIN'] }
);
