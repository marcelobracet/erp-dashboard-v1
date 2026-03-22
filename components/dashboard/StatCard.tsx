import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trendLabel?: string;
  trendVariant?: 'up' | 'down' | 'neutral';
  right?: React.ReactNode;
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  trendLabel,
  trendVariant = 'neutral',
  right,
  loading = false,
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
          {loading ? (
            <div className="space-y-3">
              <Skeleton variant="text" width={160} aria-label="Carregando" />
              <Skeleton variant="rounded" width={96} height={36} aria-label="Carregando" />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Skeleton variant="text" width={180} aria-label="Carregando" />
                <Skeleton variant="text" width={140} aria-label="Carregando" />
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        {right && (
          <div className="shrink-0">
            {loading ? (
              <Skeleton variant="rounded" width={44} height={44} aria-label="Carregando" />
            ) : (
              right
            )}
          </div>
        )}
      </div>
    </div>
  );
}
