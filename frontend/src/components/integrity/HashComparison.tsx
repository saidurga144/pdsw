import React from "react";
import { Copy, Check, FileCode, Database, Cpu } from "lucide-react";
import { IntegrityBadge } from "./IntegrityBadge";
import { clsx } from "clsx";

interface HashComparisonProps {
  expectedHash: string;
  currentDatabaseHash: string;
  ipfsCid: string;
  status: "VERIFIED" | "MISMATCH_DETECTED" | "VERIFICATION_PENDING";
  lastVerifiedAt?: string;
  compact?: boolean;
}

export const HashComparison: React.FC<HashComparisonProps> = ({
  expectedHash,
  currentDatabaseHash,
  ipfsCid,
  status,
  lastVerifiedAt,
  compact = false,
}) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isMatch = status === "VERIFIED";

  return (
    <div className="bg-card border border-border text-foreground rounded-md p-4 font-mono text-xs shadow-card">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
        <div className="flex items-center gap-2 font-sans font-semibold text-foreground">
          <Cpu className="w-4 h-4 text-primary" />
          <span>Cryptographic Hash Integrity Matrix</span>
        </div>
        <IntegrityBadge status={status} size="sm" />
      </div>

      <div className="space-y-3">
        <div className="bg-background rounded-md p-2.5 border border-border">
          <div className="flex items-center justify-between text-muted-foreground font-sans mb-1 text-[11px]">
            <span className="flex items-center gap-1 font-medium">
              <Database className="w-3 h-3 text-primary" /> Current Database
              Hash (SHA-256)
            </span>
            <button
              onClick={() => copyToClipboard(currentDatabaseHash, "db")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {copiedField === "db" ? (
                <Check className="w-3 h-3 text-primary" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
          <p className="text-foreground break-all text-[11px] select-all">
            {currentDatabaseHash}
          </p>
        </div>

        <div className="bg-background rounded-md p-2.5 border border-border">
          <div className="flex items-center justify-between text-muted-foreground font-sans mb-1 text-[11px]">
            <span className="flex items-center gap-1 font-medium">
              <FileCode className="w-3 h-3 text-primary" /> IPFS Immutable
              Provenance CID
            </span>
            <button
              onClick={() => copyToClipboard(ipfsCid, "ipfs")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {copiedField === "ipfs" ? (
                <Check className="w-3 h-3 text-primary" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
          <p className="text-primary font-semibold break-all text-[11px] select-all">
            {ipfsCid}
          </p>
        </div>

        <div className="bg-background rounded-md p-2.5 border border-border">
          <div className="flex items-center justify-between text-muted-foreground font-sans mb-1 text-[11px]">
            <span className="font-medium">Expected Block Anchor</span>
            <button
              onClick={() => copyToClipboard(expectedHash, "exp")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {copiedField === "exp" ? (
                <Check className="w-3 h-3 text-primary" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
          <p
            className={clsx(
              "break-all text-[11px] select-all",
              isMatch
                ? "text-foreground font-medium"
                : "text-destructive font-bold",
            )}
          >
            {expectedHash}
          </p>
        </div>
      </div>

      {lastVerifiedAt && (
        <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground font-sans">
          <span>Automated Daemon Status: ACTIVE</span>
          <span>Verified: {new Date(lastVerifiedAt).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};
