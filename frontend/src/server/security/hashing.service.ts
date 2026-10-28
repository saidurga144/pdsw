import crypto from "crypto";
import { CanonicalizationService } from "./canonicalization.service";

export class HashingService {
  private static readonly DEFAULT_SALT =
    process.env.INTEGRITY_SALT ||
    process.env.SHA256_INTEGRITY_SALT ||
    "pdsw-cryptographic-salt-2026";

  /**
   * Generates a deterministic SHA-256 hash for transactional database records.
   * Format: 64-character lowercase hex string.
   */
  static generateSHA256(data: any, customSalt?: string): string {
    const canonicalStr = CanonicalizationService.canonicalize(data);
    const salt = customSalt || this.DEFAULT_SALT;
    const payload = `${canonicalStr}|salt:${salt}`;
    return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
  }

  /**
   * Generates a deterministic SHA-512 hash for MongoDB security logs & SOC events.
   * Format: 128-character lowercase hex string.
   */
  static generateSHA512(data: any, customSalt?: string): string {
    const canonicalStr = CanonicalizationService.canonicalize(data);
    const salt = customSalt || this.DEFAULT_SALT;
    const payload = `${canonicalStr}|salt:${salt}|algo:sha512`;
    return crypto.createHash("sha512").update(payload, "utf8").digest("hex");
  }

  /**
   * Constant-time verification to prevent timing side-channel attacks.
   */
  static verifySHA256(
    data: any,
    expectedHash: string,
    customSalt?: string,
  ): boolean {
    if (
      !expectedHash ||
      typeof expectedHash !== "string" ||
      expectedHash.length !== 64
    ) {
      return false;
    }
    const computed = this.generateSHA256(data, customSalt);
    try {
      const bufA = Buffer.from(computed, "hex");
      const bufB = Buffer.from(expectedHash, "hex");
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /**
   * Constant-time verification for SHA-512 hashes.
   */
  static verifySHA512(
    data: any,
    expectedHash: string,
    customSalt?: string,
  ): boolean {
    if (
      !expectedHash ||
      typeof expectedHash !== "string" ||
      expectedHash.length !== 128
    ) {
      return false;
    }
    const computed = this.generateSHA512(data, customSalt);
    try {
      const bufA = Buffer.from(computed, "hex");
      const bufB = Buffer.from(expectedHash, "hex");
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /**
   * Computes a double-hash fingerprint for IPFS manifest verification.
   */
  static computeManifestFingerprint(manifest: Record<string, any>): string {
    const canonical = CanonicalizationService.canonicalize(manifest);
    return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
  }
}
