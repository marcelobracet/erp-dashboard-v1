"use client";

import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export interface BarChartDatum {
  label: string;
  approved: number;
  rejected: number;
  /** Orçamentos em aberto (pendente / rascunho / enviado), pelo mês de criação. */
  open: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>; // recharts payload
  label?: string;
}) {
  if (!active) return null;
  const rows = (payload ?? []).filter((p) => typeof p?.value === 'number');
  return (
    <div className="rounded-lg border border-glass-10 bg-glass-15 px-3 py-2 shadow-lg">
      <div className="text-xs text-text-60">{label}</div>
      <div className="mt-1 space-y-1">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-6 text-sm">
            <span className="text-text-80">{r.name}</span>
            <span className="font-semibold text-foreground">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarChart({
  data,
  height = 180,
  loading = false,
}: {
  data: BarChartDatum[];
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
          <div className="grid h-full grid-cols-6 items-end gap-3">
            <Skeleton height="52%" className="w-full rounded-md" aria-label="Carregando" />
            <Skeleton height="80%" className="w-full rounded-md" aria-label="Carregando" />
            <Skeleton height="44%" className="w-full rounded-md" aria-label="Carregando" />
            <Skeleton height="70%" className="w-full rounded-md" aria-label="Carregando" />
            <Skeleton height="62%" className="w-full rounded-md" aria-label="Carregando" />
            <Skeleton height="90%" className="w-full rounded-md" aria-label="Carregando" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }} aria-label="Aprovados, rejeitados e em aberto">
      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-glass-10)" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--color-text-60)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide domain={[0, 'dataMax']} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(5, 10, 48, 0.06)' }} />
          <Legend
            verticalAlign="bottom"
            height={24}
            wrapperStyle={{ color: 'var(--color-text-60)', fontSize: 12 }}
          />
          <Bar
            dataKey="open"
            name="Em aberto"
            fill="rgba(251, 191, 36, 0.85)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="approved"
            name="Aprovados"
            fill="var(--color-accent-90)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="rejected"
            name="Rejeitados"
            fill="rgba(248, 113, 113, 0.75)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
}
