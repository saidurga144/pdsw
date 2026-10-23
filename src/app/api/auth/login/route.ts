import { NextRequest, NextResponse } from 'next/server';
import { WalletAuthService } from '@/server/auth/wallet-auth';
import { signJwtToken } from '@/server/auth/jwt';
import { SocService } from '@/server/services/soc.service';
import { AuditService } from '@/server/services/audit.service';
import { getClientIp } from '@/server/middleware/auth.middleware';
import { getRoleDashboard, normalizeRole } from '@/lib/role-utils';
import { Role } from '@/types';
import { DEFAULT_CHAIN_ID } from '@/lib/metamask';

export async function POST(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const host = req.headers.get('host') || 'localhost:3000';

  try {
    const body = await req.json();
    const { address, message, signature, role, selectedRole, chainId } = body;
    const requestedRole: Role = normalizeRole(selectedRole || role || 'BENEFICIARY');

    // 1. Rate Limiting: 12 attempts / 5 mins per IP
    const { RateLimiter } = await import('@/server/middleware/rateLimit.middleware');
    const ipLimit = RateLimiter.checkRateLimit(`auth:ip:${ipAddress}`, { windowMs: 300000, maxRequests: 12 });

    if (!ipLimit.allowed) {
      const retryAfter = ipLimit.retryAfterSeconds || 60;
      await SocService.logSecurityEvent({
        eventType: 'BRUTE_FORCE_ATTEMPT',
        severity: 'HIGH',
        ipAddress,
        userAgent,
        endpoint: '/api/auth/login',
        details: { reason: 'Rate limit exceeded on wallet authentication', retryAfterSeconds: retryAfter },
      });

      const res = NextResponse.json(
        { success: false, error: `Too many authentication attempts. Please retry after ${retryAfter} seconds.` },
        { status: 429 }
      );
      res.headers.set('Retry-After', String(retryAfter));
      return res;
    }

    // 2. Validate input presence
    if (!address || !message || !signature) {
      return NextResponse.json(
        { success: false, error: 'Wallet address, signed challenge message, and cryptographic signature are required.' },
        { status: 400 }
      );
    }

    // 3. Cryptographic SIWE Signature Verification & Nonce Validation
    const verifyResult = await WalletAuthService.verifySiweAuthentication({
      address,
      message,
      signature,
      expectedDomain: host,
      expectedChainId: chainId || DEFAULT_CHAIN_ID,
    });

    if (!verifyResult.success || !verifyResult.checksumAddress) {
      await SocService.logSecurityEvent({
        eventType: 'AUTH_FAILURE',
        severity: 'HIGH',
        ipAddress,
        userAgent,
        endpoint: '/api/auth/login',
        details: {
          claimedAddress: address,
          reason: verifyResult.error || 'Cryptographic wallet signature verification failed',
        },
      });

      return NextResponse.json(
        { success: false, error: verifyResult.error || 'Invalid cryptographic wallet signature.' },
        { status: 401 }
      );
    }

    const verifiedAddress = verifyResult.checksumAddress;

    // 4. Generate user identity from verified wallet
    const user = WalletAuthService.getOrCreateWalletUser(verifiedAddress, requestedRole);
    const userRole = normalizeRole(user.role);

    // 5. Generate secure JWT Session Token
    const token = signJwtToken({
      userId: user.id,
      email: user.email,
      role: userRole,
      fullName: user.name,
      jurisdiction: user.jurisdiction,
    });

    // 6. Record SOC Security & Audit Events
    await Promise.all([
      SocService.logSecurityEvent({
        eventType: 'AUTH_SUCCESS',
        severity: 'LOW',
        userId: user.id,
        userRole,
        email: user.email,
        ipAddress,
        userAgent,
        endpoint: '/api/auth/login',
        details: {
          authMethod: 'METAMASK_SIWE_VERIFIED',
          walletAddress: verifiedAddress,
          role: userRole,
        },
      }),
      AuditService.recordEvent({
        actorId: user.id,
        actorRole: userRole,
        action: 'USER_LOGIN',
        resource: 'AUTH_SESSION',
        resourceId: user.id,
        ipAddress,
        outcome: 'SUCCESS',
      }),
    ]);

    const redirectUrl = getRoleDashboard(userRole);

    const response = NextResponse.json({
      success: true,
      user,
      token,
      redirectUrl,
    });

    // Set secure HTTP cookies for Next.js SSR middleware
    response.cookies.set('pds_token', token, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
    });

    response.cookies.set('pds_role', userRole, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error: any) {
    console.error('❌ [API /api/auth/login Error]', error);
    return NextResponse.json(
      { success: false, error: 'Wallet authentication failed. Please try again.' },
      { status: 500 }
    );
  }
}
