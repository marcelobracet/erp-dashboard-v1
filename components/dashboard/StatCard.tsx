import React from 'react';

export interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trendLabel?: string;
  trendVariant?: 'up' | 'down' | 'neutral';
  right?: React.ReactNode;
}

export function StatCard({
  title,
  value,
  subtitle,
  trendLabel,
  trendVariant = 'neutral',
  right,
}: StatCardProps) {
  const trendClass =
    trendVariant === 'up'
      ? 'text-accent-muted'
      : trendVariant === 'down'
        ? 'text-red-400'
        : 'text-text-60';

  return (
    <div className="app-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-60">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
          {(subtitle || trendLabel) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {subtitle && <span className="text-sm text-text-80">{subtitle}</span>}
              {trendLabel && (
                <span className={`text-sm font-medium ${trendClass}`}>{trendLabel}</span>
              )}
            </div>
          )}
        </div>

        {right && <div className="shrink-0">{right}</div>}
      </div>
    </div>
  );
}
