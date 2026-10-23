import { NextResponse } from 'next/server';
import { withAuth } from '@/server/middleware/auth.middleware';
import { ServerBeneficiaryService } from '@/server/services/beneficiary.service';

export const GET = withAuth(
  async (req, { user }) => {
    try {
      const effectiveName = user.fullName || `Authenticated User (${user.userId})`;
      const effectiveEmail = user.email || 'citizen@pdsw.eth';
      const effectivePhone = '+91 98000 00000';
      const effectiveJurisdiction = user.jurisdiction || 'National Jurisdiction';
      const effectiveRole = user.role;

      // Role-specific profile compilation
      let roleSpecificProfile: any = null;

      if (effectiveRole === 'BENEFICIARY') {
        roleSpecificProfile = await ServerBeneficiaryService.getBeneficiaryByUserId(user.userId);
      } else if (effectiveRole === 'OFFICER') {
        roleSpecificProfile = {
          officerId: user.userId,
          fullName: effectiveName,
          email: effectiveEmail,
          phone: effectivePhone,
          assignedDistrict: effectiveJurisdiction,
          pdsCenterId: `FPS-${effectiveJurisdiction.slice(0, 3).toUpperCase()}-102`,
          role: 'OFFICER',
          status: 'ACTIVE',
          badgeNumber: `OFF-${user.userId.slice(-6).toUpperCase()}`,
        };
      } else if (effectiveRole === 'ADMIN') {
        roleSpecificProfile = {
          adminId: user.userId,
          fullName: effectiveName,
          email: effectiveEmail,
          role: 'ADMIN',
          jurisdiction: effectiveJurisdiction,
          securityClearance: 'LEVEL_5_ROOT',
          status: 'ACTIVE',
        };
      } else if (effectiveRole === 'SOC') {
        roleSpecificProfile = {
          auditorId: user.userId,
          fullName: effectiveName,
          email: effectiveEmail,
          organization: 'Comptroller and Auditor General (CAG)',
          assignedCell: effectiveJurisdiction,
          role: 'SOC',
          status: 'ACTIVE',
        };
      } else if (effectiveRole === 'SOC') {
        roleSpecificProfile = {
          analystId: user.userId,
          fullName: effectiveName,
          email: effectiveEmail,
          division: 'CERT-In Cyber Operations',
          clearance: 'TOP_SECRET_SOC',
          jurisdiction: effectiveJurisdiction,
          role: 'SOC',
          status: 'ACTIVE',
        };
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.userId,
          name: effectiveName,
          email: effectiveEmail,
          phone: effectivePhone,
          role: effectiveRole,
          jurisdiction: effectiveJurisdiction,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${user.userId}`,
        },
        profile: roleSpecificProfile,
      });
    } catch (error: any) {
      console.error('❌ [API /api/profile/me Error]', error);
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve authenticated profile.' },
        { status: 500 }
      );
    }
  }
);
