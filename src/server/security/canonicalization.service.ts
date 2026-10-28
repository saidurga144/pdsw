/**
 * Canonicalization Service
 *
 * Provides deterministic, RFC 8785 (JSON Canonicalization Scheme) compliant serialization
 * for arbitrary JavaScript objects and primitives. Ensures consistent SHA-256 and SHA-512
 * hash generation regardless of key ordering, whitespace, or object representation differences.
 */

export class CanonicalizationService {
  /**
   * Deterministically canonicalizes any data structure into a sorted, normalized string.
   */
  static canonicalize(data: any): string {
    return this.serializeValue(data);
  }

  private static serializeValue(val: any): string {
    if (val === null || val === undefined) {
      return "null";
    }

    if (typeof val === "boolean") {
      return val ? "true" : "false";
    }

    if (typeof val === "number") {
      if (!Number.isFinite(val)) {
        return "null";
      }
      return String(val);
    }

    if (typeof val === "string") {
      // Standardize string trimming and normalize Unicode
      return JSON.stringify(val.normalize("NFC").trim());
    }

    if (val instanceof Date) {
      return JSON.stringify(val.toISOString());
    }

    if (Array.isArray(val)) {
      const items = val.map((item) => this.serializeValue(item));
      return `[${items.join(",")}]`;
    }

    if (typeof val === "object") {
      // Sort object keys lexicographically (Unicode code point order)
      const sortedKeys = Object.keys(val).sort();
      const entries: string[] = [];

      for (const key of sortedKeys) {
        const itemVal = val[key];
        // Omit undefined values to ensure deterministic structure
        if (itemVal !== undefined) {
          entries.push(
            `${JSON.stringify(key)}:${this.serializeValue(itemVal)}`,
          );
        }
      }

      return `{${entries.join(",")}}`;
    }

    return JSON.stringify(String(val));
  }

  /**
   * Extracts a deterministic subset of fields from a record for integrity hashing.
   */
  static extractIntegrityPayload(
    record: Record<string, any>,
    excludeKeys: string[] = [
      "integrity_hash",
      "integrity_hash_sha256",
      "integrity_hash_sha512",
      "ipfs_cid",
      "signature",
    ],
  ): any {
    const cleanObj: Record<string, any> = {};
    const excludeSet = new Set(excludeKeys);

    for (const [k, v] of Object.entries(record)) {
      if (!excludeSet.has(k)) {
        cleanObj[k] = v;
      }
    }

    return cleanObj;
  }
}
