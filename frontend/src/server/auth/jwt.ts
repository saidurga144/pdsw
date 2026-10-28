import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { Role } from "@/types";
import { parseRole } from "@/lib/role-utils";
import { isStrongServerSecret } from "@/server/security/secret-validation";

export function getConfiguredJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET must be configured before signing or verifying tokens.");
  }
  if (process.env.NODE_ENV === "production" && !isStrongServerSecret(secret)) {
    throw new Error("JWT_SECRET must be a strong, non-placeholder production secret.");
  }
  return secret;
}

function getJwtExpiresIn(): SignOptions["expiresIn"] {
  const value = process.env.JWT_EXPIRES_IN?.trim() || "8h";
  if (/^\d+$/.test(value)) return Number(value);
  if (/^\d+(ms|s|m|h|d|w|y)$/.test(value)) {
    return value as SignOptions["expiresIn"];
  }
  throw new Error("JWT_EXPIRES_IN must be a duration such as 30m or 8h.");
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  fullName: string;
  jurisdiction?: string;
  iat?: number;
  exp?: number;
}

/**
 * Signs a cryptographically secure JWT token for authenticated users
 */
export function signJwtToken(
  payload: Omit<TokenPayload, "iat" | "exp">,
): string {
  return jwt.sign(payload, getConfiguredJwtSecret(), {
    expiresIn: getJwtExpiresIn(),
    algorithm: "HS256",
  });
}

/**
 * Verifies and decodes a JWT token. Returns decoded payload or null if invalid/expired.
 */
export function verifyJwtToken(token: string): TokenPayload | null {
  try {
    const cleanToken = token.replace(/^Bearer\s+/i, "").trim();
    const decoded = jwt.verify(cleanToken, getConfiguredJwtSecret(), {
      algorithms: ["HS256"],
    });
    if (typeof decoded === "string" || decoded.step === "METAMASK_PENDING") {
      return null;
    }
    const claims = decoded as JwtPayload & {
      userId?: unknown;
      sub?: unknown;
      role?: unknown;
      email?: unknown;
      fullName?: unknown;
      name?: unknown;
      jurisdiction?: unknown;
    };
    const userId =
      typeof claims.userId === "string"
        ? claims.userId
        : typeof claims.sub === "string"
          ? claims.sub
          : null;
    const role = parseRole(claims.role);
    if (!userId || !role || typeof claims.email !== "string") return null;
    return {
      userId,
      role,
      email: claims.email,
      fullName:
        typeof claims.fullName === "string"
          ? claims.fullName
          : typeof claims.name === "string"
            ? claims.name
            : "",
      jurisdiction:
        typeof claims.jurisdiction === "string"
          ? claims.jurisdiction
          : undefined,
      iat: claims.iat,
      exp: claims.exp,
    };
  } catch {
    return null;
  }
}
