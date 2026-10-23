
import { NextResponse } from 'next/server';

/**
 * Standard Production Security Headers configuration
 */
export const SECURITY_HEADERS = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Allowed for Next.js hydration
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: wss: ws:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),

  // Strict Transport Security (HSTS) - 2 years + include subdomains
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Prevent clickjacking via iframes
  'X-Frame-Options': 'DENY',

  // Referrer Policy: Send full URL for same-origin, domain-only for cross-origin HTTPS, none for HTTP
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy: Restrict browser hardware capabilities
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',

  // Cross-Origin policies
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-DNS-Prefetch-Control': 'off',
  'X-Permitted-Cross-Domain-Policies': 'none',
};

/**
 * Applies security headers to any outgoing NextResponse
 */
export function applySecurityHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}
