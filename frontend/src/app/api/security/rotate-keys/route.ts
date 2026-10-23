import { NextRequest, NextResponse } from 'next/server';
import { KeyManagementService } from '@/server/security/key-management.service';
import { AuditService } from '@/server/services/audit.service';
import { verifyJwtToken } from '@/server/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const session = token ? verifyJwtToken(token) : null;

    // RBAC: Only ADMIN or SOC can trigger cryptographic key rotation
    if (!session || (session.role !== 'ADMIN' && session.role !== 'SOC')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Cryptographic Key Rotation requires ADMIN or SOC clearance.' },
        { status: 403 }
      );
    }

    const rotation = KeyManagementService.rotateKeys();

    await AuditService.recordEvent({
      actorId: session.userId,
      actorRole: session.role,
      action: 'CRYPTOGRAPHIC_KEY_ROTATION',
      resource: 'GOOGLE_TINK_KEYSET',
      resourceId: `keyset-v${rotation.newVersion}`,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      outcome: 'SUCCESS',
      newState: {
        oldPrimaryKeyId: rotation.oldPrimaryKeyId,
        newPrimaryKeyId: rotation.newPrimaryKeyId,
        version: rotation.newVersion,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Google Tink Keyset successfully rotated to Version ${rotation.newVersion}.`,
      rotation: {
        newPrimaryKeyId: rotation.newPrimaryKeyId,
        newVersion: rotation.newVersion,
        sanitizedMetadata: KeyManagementService.getSanitizedMetadata(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Key rotation failed: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const metadata = KeyManagementService.getSanitizedMetadata();
    return NextResponse.json({
      success: true,
      keyset: metadata,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
