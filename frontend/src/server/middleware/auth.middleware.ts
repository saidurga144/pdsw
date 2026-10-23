import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtToken, TokenPayload } from '@/server/auth/jwt';
import { Role } from '@/types';
import { Module, Action, hasPermission } from '@/lib/rbac';
import { SocService } from '@/server/services/soc.service';
import { normalizeRole } from '@/lib/role-utils';

const FASTAPI_URL = (process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8002').replace(/\/$/, '');

export interface AuthenticatedUser extends TokenPayload {
  status?: string;
}

export type AuthenticatedHandler = (
  req: NextRequest,
  context: { user: AuthenticatedUser; params?: any }
) => Promise<NextResponse>;

/**
 * Extracts IP address safely from NextRequest
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

/**
 * Backend API Middleware Guard: Enforces valid JWT session and optional Role / Permission checks
 */
export function withAuth(
  handler: AuthenticatedHandler,
  options?: {
    requiredRoles?: Role[];
    requiredPermission?: { module: Module; action: Action };
  }
) {
  return async (req: NextRequest, contextParam?: { params?: any }): Promise<NextResponse> => {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const endpoint = req.nextUrl.pathname;

    // 1. Extract Token from Authorization header or cookie
    const authHeader = req.headers.get('authorization');
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else {
      token = req.cookies.get('pds_token')?.value || null;
    }

    if (!token) {
      // Log unauthenticated access attempt
      await SocService.logSecurityEvent({
        eventType: 'AUTH_FAILURE',
        severity: 'LOW',
        ipAddress,
        userAgent,
        endpoint,
        details: { reason: 'Missing Authorization Token' },
      });

      return NextResponse.json(
        { success: false, error: 'Authentication required. Please log in.' },
        { status: 401 }
      );
    }

    // 2. Verify JWT Cryptographically
    const payload = verifyJwtToken(token);
    if (!payload) {
      await SocService.logSecurityEvent({
        eventType: 'AUTH_FAILURE',
        severity: 'MEDIUM',
        ipAddress,
        userAgent,
        endpoint,
        details: { reason: 'Invalid or Expired JWT Token Signature' },
      });

      return NextResponse.json(
        { success: false, error: 'Invalid or expired session token.' },
        { status: 401 }
      );
    }

    const userRole = normalizeRole(payload.role);

    // JWTs remain valid after a status change; check the source of truth so
    // inactive accounts lose access to protected Next.js routes immediately.
    try {
      const accountResponse = await fetch(`${FASTAPI_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (accountResponse.status === 403) {
        return NextResponse.json(
          { success: false, error: 'This account is inactive. Please contact an administrator.' },
          { status: 403 }
        );
      }
      if (accountResponse.status === 401) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired session token.' },
          { status: 401 }
        );
      }
      if (!accountResponse.ok) {
        return NextResponse.json(
          { success: false, error: 'Account status could not be verified. Please try again.' },
          { status: 503 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Authentication service is unavailable. Please try again.' },
        { status: 503 }
      );
    }

    // 3. Role Authorization Check
    if (options?.requiredRoles && options.requiredRoles.length > 0) {
      const normalizedRequired = options.requiredRoles.map((r) => normalizeRole(r));
      if (!normalizedRequired.includes(userRole)) {
        await SocService.logSecurityEvent({
          eventType: 'RBAC_VIOLATION',
          severity: 'HIGH',
          userId: payload.userId,
          userRole: userRole,
          email: payload.email,
          ipAddress,
          userAgent,
          endpoint,
          details: {
            requiredRoles: options.requiredRoles,
            userRole,
            reason: 'Attempted access to unauthorized role portal',
          },
        });

        return NextResponse.json(
          { success: false, error: `Access denied. Role [${userRole}] does not have required portal permissions.` },
          { status: 403 }
        );
      }
    }

    // 4. Granular RBAC Permission Check
    if (options?.requiredPermission) {
      const isAllowed = hasPermission(userRole, options.requiredPermission.module, options.requiredPermission.action);
      if (!isAllowed) {
        await SocService.logSecurityEvent({
          eventType: 'RBAC_VIOLATION',
          severity: 'HIGH',
          userId: payload.userId,
          userRole: userRole,
          email: payload.email,
          ipAddress,
          userAgent,
          endpoint,
          details: {
            requiredPermission: options.requiredPermission,
            userRole,
            reason: 'Insufficient module action privileges',
          },
        });

        return NextResponse.json(
          {
            success: false,
            error: `Forbidden. Role [${userRole}] is not authorized to perform [${options.requiredPermission.action}] on [${options.requiredPermission.module}].`,
          },
          { status: 403 }
        );
      }
    }

    // 5. Execute protected handler
    return handler(req, {
      user: { ...payload, role: userRole },
      params: contextParam?.params,
    });
  };
}
