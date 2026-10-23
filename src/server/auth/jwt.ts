import jwt from 'jsonwebtoken';
import { Role } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'pdsw-super-secret-cryptographic-jwt-key-2026-production-ready';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '8h') as any;

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
export function signJwtToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

/**
 * Verifies and decodes a JWT token. Returns decoded payload or null if invalid/expired.
 */
export function verifyJwtToken(token: string): TokenPayload | null {
  try {
    const cleanToken = token.replace('Bearer ', '').trim();
    return jwt.verify(cleanToken, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}
