import jwt from "jsonwebtoken";
import { Role } from "@/types";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      "JWT_SECRET environment variable is missing or too short (minimum 32 chars). " +
        "Set a strong random value in .env.local before starting the application.",
    );
  }
  return secret.trim();
}

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "8h") as any;

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
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: "HS256",
  });
}

export function verifyJwtToken(token: string): TokenPayload | null {
  try {
    const cleanToken = token.replace("Bearer ", "").trim();
    return jwt.verify(cleanToken, getJwtSecret()) as TokenPayload;
  } catch (error) {
    return null;
  }
}
