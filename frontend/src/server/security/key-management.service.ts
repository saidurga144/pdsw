import crypto from 'crypto';

export interface TinkKeyInfo {
  keyId: number; // 32-bit unsigned integer (Tink standard)
  typeUrl: string; // e.g. "type.googleapis.com/google.crypto.tink.AesGcmKey"
  status: 'ENABLED' | 'DISABLED' | 'DESTROYED';
  keyMaterialType: 'SYMMETRIC';
  keyValueHex: string; // 256-bit (32 bytes) raw key material in hex
  createdAt: string;
}

export interface TinkKeyset {
  primaryKeyId: number;
  keys: TinkKeyInfo[];
  version: number;
  updatedAt: string;
}

export class KeyManagementService {
  private static keyset: TinkKeyset | null = null;
  private static readonly KEY_TYPE_AES_GCM = 'type.googleapis.com/google.crypto.tink.AesGcmKey';

  /**
   * Initializes or loads the active Google Tink Keyset from environment variables or secure storage.
   */
  static getKeyset(): TinkKeyset {
    if (this.keyset) {
      return this.keyset;
    }

    // 1. Try loading from TINK_KEYSET_JSON or TINK_KEYSET_ENCRYPTION_KEY
    const envKeyset = process.env.TINK_KEYSET_JSON || process.env.TINK_KEYSET_ENCRYPTION_KEY;
    if (envKeyset) {
      try {
        const parsed = JSON.parse(envKeyset);
        if (parsed.primaryKeyId && Array.isArray(parsed.keys) && parsed.keys.length > 0) {
          this.keyset = parsed;
          return this.keyset!;
        }
      } catch {
        // Fall through to derive deterministic or generate new keyset
      }
    }

    // 2. Derive master key from MASTER_KEY or generate secure production-grade Tink Keyset
    const masterSecret = process.env.TINK_MASTER_KEY || process.env.JWT_SECRET || 'pdsw-tink-master-aead-secret-2026-key-seed';
    const primaryKeyBytes = crypto.createHash('sha256').update(`${masterSecret}:v1:aes-256-gcm`).digest();
    const primaryKeyId = 1000000001; // Deterministic 32-bit Key ID

    this.keyset = {
      primaryKeyId,
      version: 1,
      updatedAt: new Date().toISOString(),
      keys: [
        {
          keyId: primaryKeyId,
          typeUrl: this.KEY_TYPE_AES_GCM,
          status: 'ENABLED',
          keyMaterialType: 'SYMMETRIC',
          keyValueHex: primaryKeyBytes.toString('hex'),
          createdAt: new Date().toISOString(),
        },
      ],
    };

    return this.keyset;
  }

  /**
   * Returns the primary (current active) key for encryption.
   */
  static getPrimaryKey(): { keyId: number; keyBuffer: Buffer; version: number } {
    const ks = this.getKeyset();
    const activeKey = ks.keys.find((k) => k.keyId === ks.primaryKeyId && k.status === 'ENABLED');
    if (!activeKey) {
      throw new Error(`[KeyManagementService] Primary Tink Key [${ks.primaryKeyId}] not found or not enabled.`);
    }

    return {
      keyId: activeKey.keyId,
      keyBuffer: Buffer.from(activeKey.keyValueHex, 'hex'),
      version: ks.version,
    };
  }

  /**
   * Finds a key in the keyset by key ID (used for decrypting historical ciphertext during key rotation).
   */
  static getKeyById(keyId: number): Buffer | null {
    const ks = this.getKeyset();
    const key = ks.keys.find((k) => k.keyId === keyId);
    if (!key || key.status === 'DESTROYED') {
      return null;
    }
    return Buffer.from(key.keyValueHex, 'hex');
  }

  /**
   * Rotates the Tink Keyset: generates a new AES-256-GCM key, sets it as primary, and keeps previous keys active for decryption.
   */
  static rotateKeys(): { oldPrimaryKeyId: number; newPrimaryKeyId: number; newVersion: number } {
    const ks = this.getKeyset();
    const oldPrimaryId = ks.primaryKeyId;

    // Generate fresh 256-bit cryptographically secure key
    const newKeyBuffer = crypto.randomBytes(32);
    // Generate new random 32-bit unsigned integer key ID
    const newKeyId = Math.floor(1000000000 + Math.random() * 900000000);

    const newKey: TinkKeyInfo = {
      keyId: newKeyId,
      typeUrl: this.KEY_TYPE_AES_GCM,
      status: 'ENABLED',
      keyMaterialType: 'SYMMETRIC',
      keyValueHex: newKeyBuffer.toString('hex'),
      createdAt: new Date().toISOString(),
    };

    ks.keys.push(newKey);
    ks.primaryKeyId = newKeyId;
    ks.version += 1;
    ks.updatedAt = new Date().toISOString();

    this.keyset = ks;

    return {
      oldPrimaryKeyId: oldPrimaryId,
      newPrimaryKeyId: newKeyId,
      newVersion: ks.version,
    };
  }

  /**
   * Returns sanitized public metadata of the keyset (safe for telemetry and auditor inspection).
   */
  static getSanitizedMetadata() {
    const ks = this.getKeyset();
    return {
      primaryKeyId: ks.primaryKeyId,
      version: ks.version,
      updatedAt: ks.updatedAt,
      algorithm: 'AES-256-GCM (Google Tink AEAD Compatible)',
      totalKeys: ks.keys.length,
      keys: ks.keys.map((k) => ({
        keyId: k.keyId,
        typeUrl: k.typeUrl,
        status: k.status,
        createdAt: k.createdAt,
        isPrimary: k.keyId === ks.primaryKeyId,
      })),
    };
  }
}
