import { CanonicalizationService } from "./canonicalization.service";
import { HashingService } from "./hashing.service";
import { TinkEncryptionService } from "./tink-encryption.service";
import { IPFSService, IntegrityManifest } from "./ipfs.service";
import { KeyManagementService } from "./key-management.service";

export interface IntegrityRecordResult {
  recordId: string;
  entityType: string;
  encryptedData: Record<string, any> | string;
  integrityHash: string;
  hashAlgorithm: "SHA-256" | "SHA-512";
  ipfsCid: string;
  encryptionVersion: number;
  keyVersion: number;
  timestamp: string;
}

export interface VerificationResult {
  record_id: string;
  entity_type: string;
  database_integrity: "VERIFIED" | "FAILED";
  ipfs_integrity: "VERIFIED" | "MISMATCH" | "CID_NOT_FOUND";
  tampering_detected: boolean;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  computed_hash: string;
  stored_database_hash: string;
  ipfs_manifest_hash?: string;
  ipfs_cid: string;
  verified_at: string;
  error_details?: string;
}

export class IntegrityService {
  /**
   * Complete Security Pipeline for new records:
   * Canonical Data -> Integrity Hash -> Encrypt Sensitive Data -> IPFS Integrity Manifest -> CID
   */
  static async secureRecord(params: {
    recordId: string;
    entityType:
      | "BENEFICIARY"
      | "DISTRIBUTION"
      | "AUDIT_EVENT"
      | "SECURITY_LOG"
      | "SOC_EVENT"
      | string;
    databaseTarget: "SQLITE" | "MONGODB";
    data: Record<string, any>;
    sensitiveKeys?: string[];
    associatedDataPrefix?: string;
  }): Promise<IntegrityRecordResult> {
    const {
      recordId,
      entityType,
      databaseTarget,
      data,
      sensitiveKeys = [],
      associatedDataPrefix = "pdsw:secure",
    } = params;
    const timestamp = new Date().toISOString();
    const { keyId, version: keyVersion } = KeyManagementService.getPrimaryKey();

    // STEP 1: Canonicalize Data
    const canonicalPayload =
      CanonicalizationService.extractIntegrityPayload(data);

    // STEP 2: Generate Deterministic Integrity Hash
    const hashAlgorithm: "SHA-256" | "SHA-512" =
      databaseTarget === "MONGODB" ? "SHA-512" : "SHA-256";
    const integrityHash =
      hashAlgorithm === "SHA-512"
        ? HashingService.generateSHA512(canonicalPayload)
        : HashingService.generateSHA256(canonicalPayload);

    // STEP 3: Encrypt Sensitive Fields using Google Tink AEAD
    let encryptedData: Record<string, any>;
    if (sensitiveKeys.length > 0) {
      encryptedData = TinkEncryptionService.encryptFields(
        data,
        sensitiveKeys,
        associatedDataPrefix,
      );
    } else {
      encryptedData = { ...data };
    }

    // STEP 4: Create & Upload Integrity Manifest to IPFS
    const ipfsResult = await IPFSService.uploadManifest({
      recordId,
      entityType,
      hashAlgorithm,
      integrityHash,
    });

    return {
      recordId,
      entityType,
      encryptedData,
      integrityHash,
      hashAlgorithm,
      ipfsCid: ipfsResult.cid,
      encryptionVersion: 1,
      keyVersion,
      timestamp,
    };
  }

  /**
   * Verifies data integrity across Database, Computed Hash, and IPFS Manifest.
   */
  static async verifyRecordIntegrity(params: {
    recordId: string;
    entityType: string;
    databaseTarget: "SQLITE" | "MONGODB";
    currentData: Record<string, any>;
    storedHash: string;
    ipfsCid: string;
    sensitiveKeys?: string[];
    associatedDataPrefix?: string;
  }): Promise<VerificationResult> {
    const {
      recordId,
      entityType,
      databaseTarget,
      currentData,
      storedHash,
      ipfsCid,
      sensitiveKeys = [],
      associatedDataPrefix = "pdsw:secure",
    } = params;
    const verified_at = new Date().toISOString();

    try {
      // 1. Decrypt sensitive fields if present to obtain original plaintext representation
      let normalizedData = { ...currentData };
      if (sensitiveKeys.length > 0) {
        normalizedData = TinkEncryptionService.decryptFields(
          currentData,
          sensitiveKeys,
          associatedDataPrefix,
        );
      }

      // 2. Canonicalize verified data
      const canonicalPayload =
        CanonicalizationService.extractIntegrityPayload(normalizedData);

      // 3. Compute current cryptographic hash
      const hashAlgorithm =
        databaseTarget === "MONGODB" ? "SHA-512" : "SHA-256";
      const computedHash =
        hashAlgorithm === "SHA-512"
          ? HashingService.generateSHA512(canonicalPayload)
          : HashingService.generateSHA256(canonicalPayload);

      // 4. Compare with Database Stored Hash (constant-time)
      const dbHashMatches =
        hashAlgorithm === "SHA-512"
          ? HashingService.verifySHA512(canonicalPayload, storedHash)
          : HashingService.verifySHA256(canonicalPayload, storedHash);

      // 5. Fetch IPFS Manifest using CID
      const manifest = await IPFSService.getByCID(ipfsCid);

      let ipfs_integrity: "VERIFIED" | "MISMATCH" | "CID_NOT_FOUND" =
        "VERIFIED";
      let ipfsManifestHash = "";

      if (!manifest) {
        // Fallback: If not found in local cache, verify if CID format is mathematically sound
        ipfs_integrity = "CID_NOT_FOUND";
      } else {
        ipfsManifestHash = manifest.integrityHash;
        if (
          manifest.integrityHash !== storedHash ||
          manifest.integrityHash !== computedHash
        ) {
          ipfs_integrity = "MISMATCH";
        }
      }

      const database_integrity = dbHashMatches ? "VERIFIED" : "FAILED";
      const isTampered = !dbHashMatches || ipfs_integrity === "MISMATCH";

      return {
        record_id: recordId,
        entity_type: entityType,
        database_integrity,
        ipfs_integrity,
        tampering_detected: isTampered,
        severity: isTampered ? "CRITICAL" : "LOW",
        computed_hash: computedHash,
        stored_database_hash: storedHash,
        ipfs_manifest_hash: ipfsManifestHash,
        ipfs_cid: ipfsCid,
        verified_at,
        error_details: isTampered
          ? `Cryptographic hash mismatch: DB=${storedHash} vs Computed=${computedHash} vs IPFS=${ipfsManifestHash}`
          : undefined,
      };
    } catch (err: any) {
      return {
        record_id: recordId,
        entity_type: entityType,
        database_integrity: "FAILED",
        ipfs_integrity: "MISMATCH",
        tampering_detected: true,
        severity: "HIGH",
        computed_hash: "ERROR",
        stored_database_hash: storedHash,
        ipfs_cid: ipfsCid,
        verified_at,
        error_details: `Integrity verification error: ${err.message}`,
      };
    }
  }
}
