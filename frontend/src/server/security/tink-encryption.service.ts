import crypto from "crypto";
import { KeyManagementService } from "./key-management.service";

/**
 * Google Tink Wire Format Constants
 * Tink standard prefix: 0x01
 * Key ID length: 4 bytes (Big-Endian uint32)
 * IV length for AES-GCM: 12 bytes (96 bits)
 * Tag length for AES-GCM: 16 bytes (128 bits)
 */
const TINK_PREFIX_BYTE = 0x01;
const TINK_PREFIX_SIZE = 1;
const KEY_ID_SIZE = 4;
const IV_SIZE = 12;
const TAG_SIZE = 16;
const HEADER_SIZE = TINK_PREFIX_SIZE + KEY_ID_SIZE + IV_SIZE; // 17 bytes

export interface EncryptedFieldPayload {
  ciphertext: string; // Base64url or Base64 encoded Tink wire payload
  keyId: number;
  version: number;
  algorithm: "AES256_GCM_TINK";
}

export class TinkEncryptionService {
  /**
   * Encrypts plaintext string or JSON data using Google Tink AEAD (AES-256-GCM)
   * with authenticated associated data (AD).
   */
  static encrypt(
    plaintext: string | Record<string, any>,
    associatedData: string = "pdsw:gov:identity:aead",
  ): string {
    const rawPlaintext =
      typeof plaintext === "string" ? plaintext : JSON.stringify(plaintext);
    const { keyId, keyBuffer, version } = KeyManagementService.getPrimaryKey();

    // 1. Generate 96-bit (12-byte) random initialization vector (IV)
    const iv = crypto.randomBytes(IV_SIZE);

    // 2. Initialize AES-256-GCM cipher
    const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv, {
      authTagLength: TAG_SIZE,
    });

    // 3. Bind Authenticated Associated Data (AAD) for tamper-proofing context
    if (associatedData) {
      cipher.setAAD(Buffer.from(associatedData, "utf8"));
    }

    // 4. Encrypt plaintext
    const encryptedBuf = Buffer.concat([
      cipher.update(rawPlaintext, "utf8"),
      cipher.final(),
    ]);

    // 5. Retrieve 128-bit authentication tag
    const tag = cipher.getAuthTag();

    // 6. Build Google Tink Wire Format Buffer:
    // [1 byte Prefix (0x01)] + [4 bytes Key ID (BE)] + [12 bytes IV] + [Ciphertext] + [16 bytes Tag]
    const headerBuf = Buffer.alloc(TINK_PREFIX_SIZE + KEY_ID_SIZE);
    headerBuf.writeUInt8(TINK_PREFIX_BYTE, 0);
    headerBuf.writeUInt32BE(keyId, 1);

    const wirePayload = Buffer.concat([headerBuf, iv, encryptedBuf, tag]);

    // Return as Base64 encoded string
    return wirePayload.toString("base64");
  }

  /**
   * Decrypts a Google Tink wire format ciphertext with AEAD verification.
   * Throws an error if tampering, key mismatch, or tag verification fails.
   */
  static decrypt(
    ciphertextBase64: string,
    associatedData: string = "pdsw:gov:identity:aead",
  ): string {
    if (!ciphertextBase64 || typeof ciphertextBase64 !== "string") {
      throw new Error(
        "[TinkEncryptionService] Invalid or empty ciphertext provided.",
      );
    }

    const wirePayload = Buffer.from(ciphertextBase64, "base64");

    if (wirePayload.length < HEADER_SIZE + TAG_SIZE) {
      throw new Error(
        "[TinkEncryptionService] Malformed Tink ciphertext: length below minimal wire threshold.",
      );
    }

    // 1. Parse header
    const prefix = wirePayload.readUInt8(0);
    if (prefix !== TINK_PREFIX_BYTE) {
      throw new Error(
        `[TinkEncryptionService] Unrecognized Tink prefix byte: 0x${prefix.toString(16)}.`,
      );
    }

    const keyId = wirePayload.readUInt32BE(1);
    const iv = wirePayload.subarray(
      TINK_PREFIX_SIZE + KEY_ID_SIZE,
      HEADER_SIZE,
    );

    // 2. Parse ciphertext and authentication tag
    const tag = wirePayload.subarray(wirePayload.length - TAG_SIZE);
    const encryptedData = wirePayload.subarray(
      HEADER_SIZE,
      wirePayload.length - TAG_SIZE,
    );

    // 3. Retrieve key from Tink Keyset
    const keyBuffer = KeyManagementService.getKeyById(keyId);
    if (!keyBuffer) {
      throw new Error(
        `[TinkEncryptionService] Keyset does not contain active key with ID: ${keyId}`,
      );
    }

    // 4. Initialize decipher and verify AEAD tag
    const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, iv, {
      authTagLength: TAG_SIZE,
    });

    if (associatedData) {
      decipher.setAAD(Buffer.from(associatedData, "utf8"));
    }

    decipher.setAuthTag(tag);

    try {
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);
      return decrypted.toString("utf8");
    } catch (err: any) {
      throw new Error(
        `[TinkEncryptionService] AEAD Decryption verification failed: Authentication Tag Mismatch or Payload Tampered (${err.message}).`,
      );
    }
  }

  /**
   * Helper to decrypt and parse JSON objects
   */
  static decryptJson<T = any>(
    ciphertextBase64: string,
    associatedData?: string,
  ): T {
    const raw = this.decrypt(ciphertextBase64, associatedData);
    return JSON.parse(raw) as T;
  }

  /**
   * Field-Level Encryption: Encrypts designated sensitive keys in an object
   */
  static encryptFields<T extends Record<string, any>>(
    obj: T,
    sensitiveKeys: (keyof T)[],
    associatedDataPrefix: string = "pdsw:field",
  ): Record<string, any> {
    const result: Record<string, any> = { ...obj };
    for (const key of sensitiveKeys) {
      const val = obj[key];
      if (val !== undefined && val !== null) {
        const ad = `${associatedDataPrefix}:${String(key)}`;
        result[String(key)] = this.encrypt(
          typeof val === "string" ? val : JSON.stringify(val),
          ad,
        );
      }
    }
    return result;
  }

  /**
   * Field-Level Decryption: Decrypts designated sensitive keys in an object
   */
  static decryptFields<T extends Record<string, any>>(
    obj: T,
    sensitiveKeys: (keyof T)[],
    associatedDataPrefix: string = "pdsw:field",
  ): Record<string, any> {
    const result: Record<string, any> = { ...obj };
    for (const key of sensitiveKeys) {
      const val = obj[key];
      if (val && typeof val === "string" && val.length > 20) {
        try {
          const ad = `${associatedDataPrefix}:${String(key)}`;
          const decryptedStr = this.decrypt(val, ad);
          try {
            result[String(key)] = JSON.parse(decryptedStr);
          } catch {
            result[String(key)] = decryptedStr;
          }
        } catch {
          // If not encrypted or already plaintext, preserve original
          result[String(key)] = val;
        }
      }
    }
    return result;
  }
}
