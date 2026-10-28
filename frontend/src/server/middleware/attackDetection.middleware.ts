import { NextRequest } from "next/server";
import { RateLimiter } from "./rateLimit.middleware";

/**
 * Known reconnaissance, honeypot, and scanner endpoints
 */
export const SUSPICIOUS_PATHS = [
  "/.env",
  "/.env.local",
  "/.env.production",
  "/.env.backup",
  "/.git",
  "/.git/config",
  "/.git/head",
  "/.svn",
  "/.aws",
  "/.aws/credentials",
  "/config",
  "/config.json",
  "/config.php",
  "/backup",
  "/backup.sql",
  "/backup.tar.gz",
  "/backup.zip",
  "/database",
  "/database.sql",
  "/dump.sql",
  "/phpmyadmin",
  "/pma",
  "/adminer",
  "/wp-admin",
  "/wp-login.php",
  "/xmlrpc.php",
  "/swagger",
  "/swagger.json",
  "/swagger-ui.html",
  "/actuator",
  "/actuator/health",
  "/actuator/env",
  "/server-status",
  "/server-info",
  "/web.config",
  "/.ds_store",
  "/id_rsa",
  "/id_dsa",
  "/.ssh",
  "/etc/passwd",
  "/proc/self/environ",
  "/cgi-bin",
];

/**
 * Known automated scanner User-Agent signatures
 */
export const SCANNER_USER_AGENTS = [
  "dirsearch",
  "nikto",
  "gobuster",
  "sqlmap",
  "nmap",
  "masscan",
  "wpscan",
  "zgrab",
  "nuclei",
  "acunetix",
  "nessus",
  "arachni",
  "openvas",
  "hydra",
  "medusa",
  "burpcollaborator",
];

/**
 * Path traversal signatures
 */
const PATH_TRAVERSAL_REGEX =
  /(\.\.[\/\\]|\%2e\%2e[\/\\]|\%252e\%252e|\%c0\%ae\%c0\%ae|\0|\%00|\/etc\/passwd|c:\\windows|c:\/windows)/i;

/**
 * SQL Injection heuristic patterns
 */
const SQLI_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
  /\w*((\%27)|(\'))(\s)*((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
  /(union(\s+)select|union(\s+)all(\s+)select)/i,
  /(information_schema|pg_catalog|pg_tables|pg_database|sqlite_master)/i,
  /(waitfor(\s+)delay|pg_sleep|sleep\(\d+\))/i,
  /(drop(\s+)table|insert(\s+)into|delete(\s+)from)/i,
];

export interface ThreatAnalysisResult {
  threatScore: number; // 0 - 100
  threatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  matchedThreats: string[];
  action: "ALLOW" | "LOG_AND_THROTTLE" | "BLOCK";
  reason?: string;
}

export class AttackDetectionService {
  /**
   * Evaluates an incoming HTTP request for directory enumeration, scanner behavior,
   * path traversal, SQL injection patterns, and threat score.
   */
  static analyzeRequest(req: NextRequest): ThreatAnalysisResult {
    const rawPath = req.nextUrl.pathname.toLowerCase();
    const searchParams = req.nextUrl.search.toLowerCase();
    const userAgent = (req.headers.get("user-agent") || "").toLowerCase();
    const matchedThreats: string[] = [];
    let score = 0;

    // 1. Directory Enumeration & Honeypot Path Matching (Dirsearch Detection)
    for (const susPath of SUSPICIOUS_PATHS) {
      if (
        rawPath === susPath ||
        rawPath.startsWith(susPath + "/") ||
        rawPath.endsWith(susPath)
      ) {
        matchedThreats.push(`RECON_PATH_PROBE:${susPath}`);
        score += 65;
        break;
      }
    }

    // 2. Automated Scanner User-Agent Detection
    for (const scanner of SCANNER_USER_AGENTS) {
      if (userAgent.includes(scanner)) {
        matchedThreats.push(`SCANNER_USER_AGENT:${scanner}`);
        score += 75;
        break;
      }
    }

    // 3. Path Traversal Detection
    if (
      PATH_TRAVERSAL_REGEX.test(rawPath) ||
      PATH_TRAVERSAL_REGEX.test(searchParams)
    ) {
      matchedThreats.push("PATH_TRAVERSAL_PAYLOAD");
      score += 80;
    }

    // 4. SQL Injection Pattern Detection in Query Parameters
    if (searchParams) {
      for (const pattern of SQLI_PATTERNS) {
        if (pattern.test(searchParams)) {
          matchedThreats.push("SQLI_QUERY_PAYLOAD");
          score += 60;
          break;
        }
      }
    }

    // 5. Missing Standard Browser Headers on Web Route Probing
    const hasAccept = !!req.headers.get("accept");
    const isApi = rawPath.startsWith("/api/");
    if (!isApi && !hasAccept && userAgent.length < 15) {
      matchedThreats.push("ANOMALOUS_MINIMAL_HEADERS");
      score += 25;
    }

    // Determine Threat Level & Action
    let threatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    let action: "ALLOW" | "LOG_AND_THROTTLE" | "BLOCK" = "ALLOW";

    if (score >= 70) {
      threatLevel = score >= 85 ? "CRITICAL" : "HIGH";
      action = "BLOCK";
    } else if (score >= 30) {
      threatLevel = "MEDIUM";
      action = "LOG_AND_THROTTLE";
    }

    return {
      threatScore: score,
      threatLevel,
      matchedThreats,
      action,
      reason: matchedThreats.join("; "),
    };
  }

  /**
   * Handles high-threat requests by temporarily blocking the IP, recording a MongoDB security event,
   * and creating a CRITICAL SOC alert.
   */
  static async handleAttack(
    req: NextRequest,
    analysis: ThreatAnalysisResult,
    ipAddress: string,
  ): Promise<void> {
    const rawPath = req.nextUrl.pathname;
    const userAgent = req.headers.get("user-agent") || "unknown";

    // 1. Temporarily block the offending IP (15 minutes)
    RateLimiter.blockIp(ipAddress, 900000, analysis.reason || "RECON_ATTACK");

    // 2. Dispatch Security Event & SOC Alert via Internal API Pipeline
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const eventType = analysis.matchedThreats.some((t) =>
        t.startsWith("RECON_PATH"),
      )
        ? "SUSPICIOUS_IP"
        : analysis.matchedThreats.some((t) => t.includes("SQLI"))
          ? "RBAC_VIOLATION"
          : "SUSPICIOUS_IP";

      fetch(`${appUrl}/api/soc/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          severity: analysis.threatLevel,
          ipAddress,
          userAgent,
          endpoint: rawPath,
          details: {
            threatScore: analysis.threatScore,
            matchedThreats: analysis.matchedThreats,
            action: "TEMPORARILY_BLOCKED",
            blockDurationMinutes: 15,
            timestamp: new Date().toISOString(),
          },
        }),
      }).catch(() => {});
    } catch {
      // Non-blocking in Edge runtime
    }
  }
}
