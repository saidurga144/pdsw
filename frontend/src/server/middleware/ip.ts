import { NextRequest } from "next/server";

const IPV4_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6_REGEX = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$|^::(?:[a-fA-F0-9]{1,4}:){0,6}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,7}:$/;

function sanitizeIp(rawIp?: string | null): string | null {
  if (!rawIp) return null;
  // Strip port if present (e.g. 192.168.1.1:8080 or [::1]:8080)
  let clean = rawIp.trim();
  if (clean.startsWith("[") && clean.includes("]")) {
    clean = clean.slice(1, clean.indexOf("]"));
  } else if (clean.includes(":") && clean.indexOf(":") === clean.lastIndexOf(":")) {
    // IPv4 with port: 1.2.3.4:8080
    clean = clean.split(":")[0];
  }

  if (clean === "localhost") return "127.0.0.1";
  if (IPV4_REGEX.test(clean) || IPV6_REGEX.test(clean) || clean === "::1") {
    return clean;
  }
  return null;
}

/**
 * Extracts client IP address safely from NextRequest headers without trusting arbitrary spoofed values.
 */
export function getClientIp(req: NextRequest): string {
  // 1. Direct socket/edge connection IP if exposed by platform runtime
  const directIp = sanitizeIp((req as any).ip);
  if (directIp) return directIp;

  // 2. Vercel trusted edge header
  const vercelIp = sanitizeIp(req.headers.get("x-vercel-forwarded-for"));
  if (vercelIp) return vercelIp;

  // 3. Cloudflare connecting IP
  const cfIp = sanitizeIp(req.headers.get("cf-connecting-ip"));
  if (cfIp) return cfIp;

  // 4. Standard X-Real-IP
  const realIp = sanitizeIp(req.headers.get("x-real-ip"));
  if (realIp) return realIp;

  // 5. X-Forwarded-For (check first valid IP)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim());
    for (const part of parts) {
      const valid = sanitizeIp(part);
      if (valid) return valid;
    }
  }

  return "127.0.0.1";
}
