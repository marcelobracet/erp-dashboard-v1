"use client";

import React, { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { LineChart } from "@/components/dashboard/LineChart";
import { BarChart } from "@/components/dashboard/BarChart";
import { Skeleton } from "@/components/ui/Skeleton";
import { getDashboardMetricsFromApi } from "@/lib/dashboard/fromApi";
import { clientService, quoteService } from "@/lib/api/services";
import type { DashboardMetrics } from "@/lib/mock/dashboardMetrics";
import { formatCurrency, formatDate } from "@/lib/utils/format";

const EMPTY_DASHBOARD_METRICS: DashboardMetrics = {
  kpis: {
    quotesThisMonth: 0,
    quotesLastMonth: 0,
    quotesMoMChangePct: null,
    conversionRate: 0,
    conversionRateLastMonth: 0,
    conversionRateDeltaPp: null,
    estimatedRevenue: 0,
    estimatedRevenueLastMonth: 0,
    estimatedRevenueMoMChangePct: null,
    avgTicket: 0,
    avgTicketLastMonth: 0,
    avgTicketMoMChangePct: null,
    newClientsThisMonth: 0,
  },
  series: {
    quotesLast30Days: [],
    approvedVsRejectedLast6Months: [],
  },
  lists: {
    topClientsThisMonth: [],
    newClientsThisMonth: [],
  },
};

function DashboardContent() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [metricsState, setMetricsState] = useState<DashboardMetrics | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const metrics = metricsState ?? EMPTY_DASHBOARD_METRICS;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const [quotes, clients] = await Promise.all([
          quoteService.list(),
          clientService.list({ limit: 2000 }),
        ]);
        if (!mounted) return;
        const next = getDashboardMetricsFromApi(quotes, clients, new Date());
        setMetricsState(next);
      } catch (e) {
        if (!mounted) return;
        setLoadError(e instanceof Error ? e.message : "Não foi possível carregar o dashboard.");
        setMetricsState(EMPTY_DASHBOARD_METRICS);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const momLabel = (pct: number | null) => {
    if (pct === null) return "Sem base";
    const value = Math.round(pct * 100);
    const sign = value > 0 ? "+" : "";
    return `${sign}${value}% vs mês anterior`;
  };

  const ppLabel = (pp: number | null) => {
    if (pp === null) return "Sem base";
    const rounded = Math.round(pp * 10) / 10;
    const sign = rounded > 0 ? "+" : "";
    return `${sign}${rounded}pp vs mês anterior`;
  };

  const pct = (rate: number) => `${Math.round(rate * 100)}%`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground">
            Bem-vindo, {user?.name || user?.email}!
          </h1>
          <p className="text-text-80">
            Visão comercial do mês — orçamentos e clientes da API (agregação no navegador até existir endpoint de relatórios).
          </p>
          {loadError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {loadError}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            title="Orçamentos no mês"
            value={String(metrics.kpis.quotesThisMonth)}
            subtitle={`Mês anterior: ${metrics.kpis.quotesLastMonth}`}
            trendLabel={momLabel(metrics.kpis.quotesMoMChangePct)}
            loading={loading}
            trendVariant={
              metrics.kpis.quotesMoMChangePct === null
                ? "neutral"
                : metrics.kpis.quotesMoMChangePct >= 0
                  ? "up"
                  : "down"
            }
            right={
              <div className="h-11 w-11 rounded-xl bg-accent-15 text-accent-muted flex items-center justify-center">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            }
          />

          <StatCard
            title="Taxa de conversão"
            value={pct(metrics.kpis.conversionRate)}
            subtitle="Aprovados ÷ orçamentos do mês (exceto rascunhos)"
            trendLabel={ppLabel(metrics.kpis.conversionRateDeltaPp)}
            loading={loading}
            trendVariant={
              metrics.kpis.conversionRateDeltaPp === null
                ? "neutral"
                : metrics.kpis.conversionRateDeltaPp >= 0
                  ? "up"
                  : "down"
            }
            right={
              <div className="h-11 w-11 rounded-xl bg-accent-15 text-accent-muted flex items-center justify-center">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            }
          />

          <StatCard
            title="Faturamento estimado"
            value={formatCurrency(metrics.kpis.estimatedRevenue)}
            subtitle="Somente aprovados"
            trendLabel={momLabel(metrics.kpis.estimatedRevenueMoMChangePct)}
            loading={loading}
            trendVariant={
              metrics.kpis.estimatedRevenueMoMChangePct === null
                ? "neutral"
                : metrics.kpis.estimatedRevenueMoMChangePct >= 0
                  ? "up"
                  : "down"
            }
            right={
              <div className="h-11 w-11 rounded-xl bg-accent-15 text-accent-muted flex items-center justify-center">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-10V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            }
          />

          <StatCard
            title="Ticket médio"
            value={formatCurrency(metrics.kpis.avgTicket)}
            subtitle="Aprovados no mês"
            trendLabel={momLabel(metrics.kpis.avgTicketMoMChangePct)}
            loading={loading}
            trendVariant={
              metrics.kpis.avgTicketMoMChangePct === null
                ? "neutral"
                : metrics.kpis.avgTicketMoMChangePct >= 0
                  ? "up"
                  : "down"
            }
            right={
              <div className="h-11 w-11 rounded-xl bg-accent-15 text-accent-muted flex items-center justify-center">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2-2 4 4m0 0l2-2m-2 2V7" />
                </svg>
              </div>
            }
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="app-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Orçamentos (últimos 30 dias)</h2>
                <p className="text-sm text-text-60">Volume diário (sem rascunhos)</p>
              </div>
            </div>
            <div className="mt-5">
              <LineChart data={metrics.series.quotesLast30Days} loading={loading} />
            </div>
          </div>

          <div className="app-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Aprovados vs rejeitados</h2>
                <p className="text-sm text-text-60">Últimos 6 meses</p>
              </div>
            </div>
            <div className="mt-5">
              <BarChart data={metrics.series.approvedVsRejectedLast6Months} loading={loading} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="app-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Novos clientes no mês</h2>
                <p className="mt-1 text-sm text-text-60">
                  {metrics.kpis.newClientsThisMonth} novos clientes (mais recentes abaixo)
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-accent-15 text-accent-muted flex items-center justify-center">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-glass-10 bg-glass-5 px-4 py-3"
                    >
                      <Skeleton variant="text" width={220} aria-label="Carregando" />
                      <div className="mt-2">
                        <Skeleton variant="text" width={120} aria-label="Carregando" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : metrics.lists.newClientsThisMonth.length === 0 ? (
                <p className="text-sm text-text-80">Nenhum novo cliente registrado neste mês.</p>
              ) : (
                metrics.lists.newClientsThisMonth.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-glass-10 bg-glass-5 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-text-60">ID: {c.id}</p>
                    </div>
                    <span className="text-xs text-text-60">{formatDate(c.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="app-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Top 5 clientes por valor orçado</h2>
                <p className="mt-1 text-sm text-text-60">Somatório do mês (sem rascunhos)</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-accent-15 text-accent-muted flex items-center justify-center">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 11V7a1 1 0 112 0v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H7a1 1 0 110-2h4z" />
                </svg>
              </div>
            </div>

            <div className="mt-5">
              {loading ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-glass-10 bg-glass-5 px-4 py-3">
                    <Skeleton variant="text" width="60%" aria-label="Carregando" />
                  </div>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-glass-10 bg-glass-5 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Skeleton variant="text" width="45%" aria-label="Carregando" />
                        <Skeleton variant="text" width={44} aria-label="Carregando" />
                        <Skeleton variant="text" width={90} aria-label="Carregando" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : metrics.lists.topClientsThisMonth.length === 0 ? (
                <p className="text-sm text-text-80">Ainda não há orçamentos neste mês.</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-glass-10">
                  <table className="min-w-full divide-y divide-glass-10">
                    <thead className="bg-glass-5">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-60 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-60 uppercase tracking-wider w-[84px]">
                          Orç.
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-text-60 uppercase tracking-wider w-[160px]">
                          Valor
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-glass-5 divide-y divide-glass-10">
                      {metrics.lists.topClientsThisMonth.map((c) => (
                        <tr key={c.id} className="hover:bg-glass-10 transition-colors">
                          <td className="px-4 py-3 text-sm text-text-80 max-w-[260px]">
                            <span className="truncate inline-block max-w-[260px]">{c.name}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-text-80">{c.quotes}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-foreground">
                            {formatCurrency(c.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
