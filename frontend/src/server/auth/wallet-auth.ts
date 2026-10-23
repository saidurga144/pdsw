import crypto from 'crypto';
import { ethers } from 'ethers';
import { Role, User } from '@/types';
import { normalizeRole } from '@/lib/role-utils';

export interface StoredNonce {
  nonce: string;
  address: string;
  issuedAt: string;
  expiresAt: string;
}

// In-memory Nonce Storage with automatic TTL expiration (5 minutes)
const NONCE_TTL_MS = 5 * 60 * 1000;
const nonceStore = new Map<string, StoredNonce>();

// Cleanup stale nonces every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, item] of nonceStore.entries()) {
      if (new Date(item.expiresAt).getTime() < now) {
        nonceStore.delete(key);
      }
    }
  }, 60 * 1000).unref?.();
}

export class WalletAuthService {
  /**
   * Generates a cryptographically strong unique authentication nonce for a wallet address
   */
  static generateNonce(address: string): { nonce: string; issuedAt: string; expiresAt: string } {
    const cleanAddress = address.toLowerCase();
    const nonce = crypto.randomBytes(16).toString('hex');
    const now = new Date();
    const issuedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + NONCE_TTL_MS).toISOString();

    nonceStore.set(cleanAddress, {
      nonce,
      address: cleanAddress,
      issuedAt,
      expiresAt,
    });

    return { nonce, issuedAt, expiresAt };
  }

  /**
   * Validates and immediately burns (deletes) the nonce to prevent replay attacks
   */
  static validateAndBurnNonce(address: string, nonce: string): boolean {
    const cleanAddress = address.toLowerCase();
    const stored = nonceStore.get(cleanAddress);

    if (!stored) return false;

    // Check expiration
    if (new Date(stored.expiresAt).getTime() < Date.now()) {
      nonceStore.delete(cleanAddress);
      return false;
    }

    // Check nonce value match
    if (stored.nonce !== nonce) {
      return false;
    }

    // Burn nonce immediately
    nonceStore.delete(cleanAddress);
    return true;
  }

  /**
   * Parses standard EIP-4361 / SIWE message fields
   */
  static parseSiweMessage(message: string): {
    domain?: string;
    address?: string;
    uri?: string;
    version?: string;
    chainId?: number;
    nonce?: string;
    issuedAt?: string;
    expirationTime?: string;
  } {
    const lines = message.split('\n');
    const parsed: Record<string, any> = {};

    if (lines.length > 0) {
      const matchDomain = lines[0].match(/^([^\s]+) wants you to sign in/);
      if (matchDomain) parsed.domain = matchDomain[1];
    }
    if (lines.length > 1) {
      parsed.address = lines[1].trim();
    }

    for (const line of lines) {
      if (line.startsWith('URI: ')) parsed.uri = line.substring(5).trim();
      else if (line.startsWith('Version: ')) parsed.version = line.substring(9).trim();
      else if (line.startsWith('Chain ID: ')) parsed.chainId = parseInt(line.substring(10).trim(), 10);
      else if (line.startsWith('Nonce: ')) parsed.nonce = line.substring(7).trim();
      else if (line.startsWith('Issued At: ')) parsed.issuedAt = line.substring(11).trim();
      else if (line.startsWith('Expiration Time: ')) parsed.expirationTime = line.substring(17).trim();
    }

    return parsed;
  }

  /**
   * Cryptographically verifies a SIWE message and signature
   */
  static async verifySiweAuthentication(params: {
    address: string;
    message: string;
    signature: string;
    expectedDomain?: string;
    expectedChainId?: number;
  }): Promise<{ success: boolean; error?: string; checksumAddress?: string }> {
    try {
      const { address, message, signature, expectedDomain, expectedChainId } = params;

      if (!address || !message || !signature) {
        return { success: false, error: 'Missing address, message, or signature parameters.' };
      }

      // 1. Recover signer address from cryptographic signature
      let recoveredAddress: string;
      try {
        recoveredAddress = ethers.verifyMessage(message, signature);
      } catch (recErr: any) {
        return { success: false, error: 'Cryptographic signature verification failed.' };
      }

      // 2. Compare recovered signer address with claimed wallet address (case-insensitive)
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return {
          success: false,
          error: `Signer address mismatch. Claimed: ${address}, Recovered: ${recoveredAddress}`,
        };
      }

      // 3. Parse SIWE message fields
      const parsed = this.parseSiweMessage(message);

      if (!parsed.nonce) {
        return { success: false, error: 'SIWE message is missing a valid nonce.' };
      }

      // 4. Validate and burn nonce to prevent replay attacks
      const isNonceValid = this.validateAndBurnNonce(address, parsed.nonce);
      if (!isNonceValid) {
        return {
          success: false,
          error: 'Authentication nonce is invalid, expired, or has already been used.',
        };
      }

      // 5. Validate expiration time if specified in message
      if (parsed.expirationTime) {
        const expDate = new Date(parsed.expirationTime);
        if (isNaN(expDate.getTime()) || expDate.getTime() < Date.now()) {
          return { success: false, error: 'Authentication challenge message has expired.' };
        }
      }

      // 6. Validate domain if specified
      if (expectedDomain && parsed.domain) {
        const cleanExpected = expectedDomain.split(':')[0].toLowerCase();
        const cleanActual = parsed.domain.split(':')[0].toLowerCase();
        if (cleanExpected !== cleanActual && cleanActual !== 'localhost' && !cleanActual.includes('localhost')) {
          return { success: false, error: `Domain mismatch in SIWE message: ${parsed.domain}` };
        }
      }

      // 7. Validate chain ID if specified
      if (expectedChainId && parsed.chainId && parsed.chainId !== expectedChainId) {
        console.warn(`Chain ID mismatch: expected ${expectedChainId}, got ${parsed.chainId}`);
      }

      // Normalize checksum address
      const checksumAddress = ethers.getAddress(recoveredAddress);

      return {
        success: true,
        checksumAddress,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Signature verification error.' };
    }
  }

  /**
   * Resolves or formats a User identity from a verified wallet address and role
   */
  static getOrCreateWalletUser(walletAddress: string, role: Role): User {
    const checksum = ethers.getAddress(walletAddress);
    const short = `${checksum.slice(0, 6)}...${checksum.slice(-4)}`;
    const userId = `usr-w-${checksum.slice(2, 10).toLowerCase()}`;
    const canonicalRole = normalizeRole(role);

    const roleNameMap: Record<Role, string> = {
      BENEFICIARY: `Citizen (${short})`,
      PDS_OFFICER: `PDS Inspector (${short})`,
      ADMIN: `System Administrator (${short})`,
      SOC_ANALYST: `Cyber SOC Analyst (${short})`,
    };

    const roleJurisdictionMap: Record<Role, string> = {
      BENEFICIARY: 'South Delhi, Delhi',
      PDS_OFFICER: 'Central District - Division 4',
      ADMIN: 'National Command Center',
      SOC_ANALYST: 'National CERT Cyber Security Operations',
    };

    const adminEmail = process.env.ADMIN_EMAIL || 'canikiisu@gmail.com';
    const userEmail = canonicalRole === 'ADMIN' ? adminEmail : `${checksum.slice(0, 8).toLowerCase()}@pdsw.eth`;

    return {
      id: userId,
      name: roleNameMap[canonicalRole] || `User (${short})`,
      email: userEmail,
      role: canonicalRole,
      walletAddress: checksum,
      jurisdiction: roleJurisdictionMap[canonicalRole] || 'National Jurisdiction',
      status: 'ACTIVE',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${checksum}`,
    };
  }
}
