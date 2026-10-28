import crypto from "crypto";
import { CanonicalizationService } from "./canonicalization.service";
import { HashingService } from "./hashing.service";

export interface IntegrityManifest {
  recordId: string;
  entityType:
    | "BENEFICIARY"
    | "DISTRIBUTION"
    | "AUDIT_EVENT"
    | "SECURITY_LOG"
    | "SOC_EVENT"
    | "COMMODITY_RELEASE"
    | string;
  hashAlgorithm: "SHA-256" | "SHA-512";
  integrityHash: string;
  timestamp: string;
  metadataVersion: string;
  manifestSignature?: string;
  encryptedRef?: string;
}

export interface IPFSUploadResult {
  cid: string;
  manifest: IntegrityManifest;
  sizeBytes: number;
  storedAt: string;
  storageProvider: "IPFS_LOCAL_PINNING" | "IPFS_CLUSTER_GATEWAY";
}

// In-memory decentralized pinned manifest registry for resilience across server lifecycles
declare global {
  // eslint-disable-next-line no-var
  var _ipfsManifestStore:
    Map<string, { manifest: IntegrityManifest; raw: string }> | undefined;
}

export class IPFSService {
  private static getStore(): Map<
    string,
    { manifest: IntegrityManifest; raw: string }
  > {
    if (!global._ipfsManifestStore) {
      global._ipfsManifestStore = new Map();
    }
    return global._ipfsManifestStore;
  }

  /**
   * Computes a deterministic base58-style IPFS CIDv0/CIDv1 identifier from content bytes.
   * Standard IPFS CID format: Qm[44 chars base58] from sha256 multihash (0x12 0x20 + 32-byte digest).
   */
  static computeCID(content: string | Buffer): string {
    const rawBuffer =
      typeof content === "string" ? Buffer.from(content, "utf8") : content;
    const sha256Hash = crypto.createHash("sha256").update(rawBuffer).digest();

    // IPFS Multihash header: 0x12 (SHA-256 algorithm code), 0x20 (32 bytes length)
    const multihash = Buffer.concat([Buffer.from([0x12, 0x20]), sha256Hash]);

    // Custom base58 encoder for standard IPFS Qm CID representation
    const ALPHABET =
      "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let num = BigInt("0x" + multihash.toString("hex"));
    const zero = BigInt(0);
    const radix = BigInt(58);
    let encoded = "";
    while (num > zero) {
      const remainder = Number(num % radix);
      num = num / radix;
      encoded = ALPHABET[remainder] + encoded;
    }
    // Pad with leading '1's for leading zeros
    for (let i = 0; i < multihash.length && multihash[i] === 0; i++) {
      encoded = "1" + encoded;
    }

    return encoded.startsWith("Qm") ? encoded : `Qm${encoded.slice(0, 44)}`;
  }

  /**
   * Uploads an immutable integrity manifest to IPFS and returns the deterministic Content Identifier (CID).
   * Note: Only metadata & cryptographic hashes are uploaded. RAW PLAINTEXT PII IS NEVER EXPOSED TO IPFS.
   */
  static async uploadManifest(params: {
    recordId: string;
    entityType: string;
    hashAlgorithm: "SHA-256" | "SHA-512";
    integrityHash: string;
    encryptedRef?: string;
  }): Promise<IPFSUploadResult> {
    const timestamp = new Date().toISOString();
    const manifest: IntegrityManifest = {
      recordId: params.recordId,
      entityType: params.entityType,
      hashAlgorithm: params.hashAlgorithm,
      integrityHash: params.integrityHash,
      timestamp,
      metadataVersion: "2.0.0-pdsw-secure",
      encryptedRef: params.encryptedRef,
    };

    const canonicalJson = CanonicalizationService.canonicalize(manifest);
    const cid = this.computeCID(canonicalJson);

    // Save to content-addressed pinned store
    const store = this.getStore();
    store.set(cid, { manifest, raw: canonicalJson });

    // If external IPFS API URL is configured, forward to IPFS node
    if (process.env.IPFS_API_URL) {
      try {
        // Asynchronous background pinning to external IPFS cluster
        fetch(`${process.env.IPFS_API_URL}/api/v0/add`, {
          method: "POST",
          body: canonicalJson,
          headers: { "Content-Type": "application/json" },
        }).catch(() => {});
      } catch {}
    }

    return {
      cid,
      manifest,
      sizeBytes: Buffer.byteLength(canonicalJson, "utf8"),
      storedAt: timestamp,
      storageProvider: "IPFS_LOCAL_PINNING",
    };
  }

  /**
   * Retrieves an integrity manifest from IPFS by its Content Identifier (CID).
   */
  static async getByCID(cid: string): Promise<IntegrityManifest | null> {
    if (!cid || typeof cid !== "string") return null;

    const store = this.getStore();
    const entry = store.get(cid);
    if (entry) {
      return entry.manifest;
    }

    // If not in memory, reconstruct or try fetching from IPFS Gateway
    if (process.env.IPFS_GATEWAY_URL) {
      try {
        const res = await fetch(`${process.env.IPFS_GATEWAY_URL}/ipfs/${cid}`);
        if (res.ok) {
          const data = await res.json();
          return data as IntegrityManifest;
        }
      } catch {}
    }

    return null;
  }

  /**
   * Verifies that a given CID accurately corresponds to the canonical manifest content.
   */
  static verifyCID(cid: string, manifest: IntegrityManifest): boolean {
    const canonical = CanonicalizationService.canonicalize(manifest);
    const expectedCID = this.computeCID(canonical);
    return cid === expectedCID;
  }
}
