import React from 'react';
import { ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface IntegrityBadgeProps {
  status: 'VERIFIED' | 'MISMATCH_DETECTED' | 'MISMATCH' | 'VERIFICATION_PENDING' | 'UNVERIFIED';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const IntegrityBadge: React.FC<IntegrityBadgeProps> = ({
  status,
  size = 'md',
  showText = true,
}) => {
  const isVerified = status === 'VERIFIED';
  const isMismatch = status === 'MISMATCH_DETECTED' || status === 'MISMATCH';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full border transition-all',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-3 py-1.5 text-sm',
        isVerified && 'bg-secondary text-foreground border-border',
        isMismatch && 'bg-destructive-light text-destructive border-destructive-border',
        !isVerified && !isMismatch && 'bg-muted text-muted-foreground border-border'
      )}
    >
      {isVerified && <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
      {isMismatch && <ShieldAlert className="w-3.5 h-3.5 text-destructive shrink-0" />}
      {!isVerified && !isMismatch && <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}

      {showText && (
        <span className="font-semibold text-[11px] tracking-wide">
          {isVerified && 'VERIFIED'}
          {isMismatch && 'MISMATCH DETECTED'}
          {!isVerified && !isMismatch && 'VERIFICATION PENDING'}
        </span>
      )}
    </span>
  );
};
