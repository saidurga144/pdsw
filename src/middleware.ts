import { NextResponse, NextRequest } from 'next/server';
import { applySecurityHeaders } from '@/server/middleware/securityHeaders.middleware';
import { RateLimiter } from '@/server/middleware/rateLimit.middleware';
import { AttackDetectionService } from '@/server/middleware/attackDetection.middleware';
import { getClientIp } from '@/server/middleware/ip';

type CanonicalRole = 'BENEFICIARY' | 'OFFICER' | 'ADMIN' | 'SOC';

const ROLE_ROUTE_MAP: Record<CanonicalRole, string> = {
  BENEFICIARY: '/beneficiary',
  OFFICER: '/officer',
  ADMIN: '/admin',
  SOC: '/soc',
};

const ROLE_DASHBOARD_MAP: Record<CanonicalRole, string> = {
  BENEFICIARY: '/beneficiary/dashboard',
  OFFICER: '/officer/dashboard',
  ADMIN: '/admin/dashboard',
  SOC: '/soc/dashboard',
};

const protectedPrefixes = ['/beneficiary', '/officer', '/admin', '/soc'];

function isProtected(pathname: string): boolean {
  return protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function getOwnerRole(pathname: string): CanonicalRole | null {
  for (const [role, prefix] of Object.entries(ROLE_ROUTE_MAP)) {
    if (pathname.startsWith(prefix)) return role as CanonicalRole;
  }
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIp = getClientIp(request);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. LAYER 1: IP Block & Rate Limiting Verification
  // ─────────────────────────────────────────────────────────────────────────────
  const blockStatus = RateLimiter.isBlocked(clientIp);
  if (blockStatus.blocked) {
    const res = NextResponse.json(
      {
        success: false,
        error: 'Access temporarily throttled due to anomalous traffic pattern. Please retry later.',
        retryAfter: blockStatus.remainingSeconds,
      },
      { status: 429 }
    );
    res.headers.set('Retry-After', String(blockStatus.remainingSeconds || 60));
    return applySecurityHeaders(res);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. LAYER 2: WAF & Automated Scanner / Dirsearch Reconnaissance Detection
  // ─────────────────────────────────────────────────────────────────────────────
  const attackAnalysis = AttackDetectionService.analyzeRequest(request);
  if (attackAnalysis.action === 'BLOCK') {
    // Asynchronously log the attack event and block the IP
    AttackDetectionService.handleAttack(request, attackAnalysis, clientIp).catch(() => {});

    const res = NextResponse.json(
      {
        success: false,
        error: 'Forbidden: Request blocked by application security firewall policy.',
        reason: 'UNAUTHORIZED_RECONNAISSANCE_OR_PAYLOAD_DETECTED',
      },
      { status: 403 }
    );
    return applySecurityHeaders(res);
  }

  // Global Sliding-Window Rate Limit (120 req / 60s per IP)
  const rateLimit = RateLimiter.checkRateLimit(clientIp, { windowMs: 60000, maxRequests: 120 });
  if (!rateLimit.allowed) {
    const res = NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Rate limit exceeded.',
        retryAfter: rateLimit.retryAfterSeconds,
      },
      { status: 429 }
    );
    res.headers.set('Retry-After', String(rateLimit.retryAfterSeconds || 60));
    return applySecurityHeaders(res);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. LAYER 3: Authentication & Role-Based Access Control
  // ─────────────────────────────────────────────────────────────────────────────
  const token = request.cookies.get('pds_token')?.value;
  const role = request.cookies.get('pds_role')?.value as CanonicalRole | undefined;

  // Guard: unauthenticated users cannot access protected routes
  if (isProtected(pathname) && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const res = NextResponse.redirect(url);
    return applySecurityHeaders(res);
  }

  // Guard: authenticated users cannot access another role's route
  if (isProtected(pathname) && token && role) {
    const ownerRole = getOwnerRole(pathname);
    if (ownerRole && ownerRole !== role) {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      url.searchParams.set('from', pathname);
      url.searchParams.set('role', role);
      const res = NextResponse.redirect(url);
      return applySecurityHeaders(res);
    }
  }

  // Redirect authenticated users from root to dashboard
  if (pathname === '/' && token && role && ROLE_DASHBOARD_MAP[role]) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_DASHBOARD_MAP[role];
    const res = NextResponse.redirect(url);
    return applySecurityHeaders(res);
  }

  // Permanently redirect all signup/register/create-account attempts to /login
  if (
    pathname === '/signup' ||
    pathname.startsWith('/signup/') ||
    pathname === '/register' ||
    pathname.startsWith('/register/') ||
    pathname === '/create-account' ||
    pathname.startsWith('/create-account/')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const res = NextResponse.redirect(url);
    return applySecurityHeaders(res);
  }

  // Redirect authenticated users away from /login page
  if (pathname === '/login' && token && role) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_DASHBOARD_MAP[role] || '/';
    const res = NextResponse.redirect(url);
    return applySecurityHeaders(res);
  }

  // Pass request through with production security headers attached
  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for Next.js static assets and images
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|logo.png).*)',
  ],
};
