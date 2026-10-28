import React from "react";
import { clsx } from "clsx";
import { AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";

interface RiskIndicatorProps {
  score: number;
  level?: "LOW" | "MEDIUM" | "HIGH";
  showDetails?: boolean;
}

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  score,
  level,
  showDetails = true,
}) => {
  const calculatedLevel =
    level || (score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW");

  return (
    <div className="flex items-center gap-2">
      <div
        className={clsx(
          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border",
          calculatedLevel === "LOW" &&
            "bg-secondary text-foreground border-border",
          calculatedLevel === "MEDIUM" &&
            "bg-muted text-foreground border-border",
          calculatedLevel === "HIGH" &&
            "bg-destructive-light text-destructive border-destructive-border",
        )}
      >
        {calculatedLevel === "LOW" && (
          <ShieldCheck className="w-3 h-3 text-primary" />
        )}
        {calculatedLevel === "MEDIUM" && (
          <AlertTriangle className="w-3 h-3 text-muted-foreground" />
        )}
        {calculatedLevel === "HIGH" && (
          <ShieldAlert className="w-3 h-3 text-destructive" />
        )}
        <span>{calculatedLevel} RISK</span>
      </div>

      {showDetails && (
        <span className="text-xs font-mono font-medium text-muted-foreground">
          ({score}/100)
        </span>
      )}
    </div>
  );
};
