import React from "react";
import { RecordVersion } from "@/types";
import { GitCommit, User, Calendar, ExternalLink } from "lucide-react";

interface VersionTimelineProps {
  versions: RecordVersion[];
}

export const VersionTimeline: React.FC<VersionTimelineProps> = ({
  versions,
}) => {
  return (
    <div className="relative pl-6 border-l-2 border-border space-y-6">
      {versions.map((ver: RecordVersion) => (
        <div key={ver.version} className="relative group">
          <div className="absolute -left-[31px] top-0 p-1.5 rounded-full bg-card text-primary border-2 border-border shadow-subtle">
            <GitCommit className="w-3.5 h-3.5" />
          </div>

          <div className="bg-card border border-border rounded-md p-4 shadow-card hover:border-primary/50 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="bg-secondary text-foreground text-xs font-bold px-2 py-0.5 rounded border border-border">
                  v{ver.version}.0
                </span>
                <span className="font-semibold text-sm text-foreground uppercase tracking-wide">
                  {ver.operation.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-muted-foreground" />{" "}
                  {ver.actorRole}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />{" "}
                  {new Date(ver.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              {ver.changeSummary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono bg-background p-2.5 rounded-md border border-border">
              <div className="min-w-0">
                <span className="text-muted-foreground font-sans block text-[10px]">
                  CURRENT SHA-256 HASH
                </span>
                <span className="text-foreground break-all">
                  {ver.currentHash.substring(0, 24)}...
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-primary font-sans block text-[10px] flex items-center gap-1 font-semibold">
                  IPFS CID <ExternalLink className="w-2.5 h-2.5" />
                </span>
                <span className="text-primary break-all">
                  {ver.ipfsCid.substring(0, 24)}...
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
