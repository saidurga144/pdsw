import React from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  description,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconBgColor = 'bg-secondary',
  iconColor = 'text-primary',
}) => {
  return (
    <div className="group border-b border-border bg-card/70 p-4 sm:p-5 transition-all hover:bg-card hover:border-primary/60 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-[9px] truncate">
            {title}
          </p>
          <p className="display-type mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground truncate">
            {value}
          </p>
        </div>
        <div className={clsx('flex size-10 shrink-0 items-center justify-center rounded-full border border-border transition-colors group-hover:border-primary', iconBgColor)}>
          <Icon className={clsx('w-5 h-5', iconColor)} />
        </div>
      </div>

      {(description || change) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {change && (
            <span
              className={clsx(
                'font-semibold px-1.5 py-0.5 rounded border text-[11px]',
                changeType === 'positive' && 'bg-secondary text-foreground border-border',
                changeType === 'negative' && 'bg-destructive-light text-destructive border-destructive-border',
                changeType === 'neutral' && 'bg-muted text-muted-foreground border-border'
              )}
            >
              {change}
            </span>
          )}
          {description && <span className="text-muted-foreground">{description}</span>}
        </div>
      )}
    </div>
  );
};
