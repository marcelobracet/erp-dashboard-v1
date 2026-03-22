"use client";

import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export interface LineChartPoint {
  label: string;
  value: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active) return null;
  const val = payload?.[0]?.value ?? 0;
  return (
    <div className="rounded-lg border border-glass-10 bg-glass-15 px-3 py-2 shadow-lg">
      <div className="text-xs text-text-60">{label}</div>
      <div className="text-sm font-semibold text-foreground">{val}</div>
    </div>
  );
}

export function LineChart({
  data,
  height = 160,
  loading = false,
}: {
  data: LineChartPoint[];
  height?: number;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div
        className="w-full"
        style={{ height }}
        aria-busy="true"
        aria-label="Carregando gráfico"
      >
        <div className="h-full w-full rounded-lg border border-glass-10 bg-glass-5 p-3">
          <Skeleton variant="rounded" className="h-full w-full" aria-label="Carregando" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }} aria-label="Orçamentos ao longo do tempo">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 10, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--color-glass-10)" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--color-text-60)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            minTickGap={12}
          />
          <YAxis hide domain={[0, 'dataMax']} />
          <Tooltip
            cursor={{ stroke: 'var(--color-glass-10)', strokeWidth: 1 }}
            content={<ChartTooltip />}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-accent-90)"
            strokeWidth={2.5}
            fill="url(#areaFill)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--color-accent-90)', fill: '#ffffff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
