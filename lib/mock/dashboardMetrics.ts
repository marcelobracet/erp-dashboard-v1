import type { MockDashboardData, MockQuote } from './dashboard';

export interface DashboardKpis {
  quotesThisMonth: number;
  quotesLastMonth: number;
  quotesMoMChangePct: number | null;

  conversionRate: number; // 0..1
  conversionRateLastMonth: number;
  conversionRateDeltaPp: number | null;

  estimatedRevenue: number;
  estimatedRevenueLastMonth: number;
  estimatedRevenueMoMChangePct: number | null;

  avgTicket: number;
  avgTicketLastMonth: number;
  avgTicketMoMChangePct: number | null;

  newClientsThisMonth: number;
}

export interface DashboardSeries {
  quotesLast30Days: Array<{ label: string; value: number }>;
  approvedVsRejectedLast6Months: Array<{
    label: string;
    approved: number;
    rejected: number;
    open: number;
  }>;
}

export interface DashboardLists {
  topClientsThisMonth: Array<{ id: string; name: string; total: number; quotes: number }>;
  newClientsThisMonth: Array<{ id: string; name: string; createdAt: string }>;
}

export interface DashboardMetrics {
  kpis: DashboardKpis;
  series: DashboardSeries;
  lists: DashboardLists;
}

function parseISO(iso: string): Date {
  return new Date(iso);
}

function monthStartUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function addMonthsUTC(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 0, 0, 0, 0));
}

function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function dayKeyUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function inRange(iso: string, start: Date, end: Date): boolean {
  const t = parseISO(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

function safePctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function shortMonthPtBR(monthIndex0: number): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return months[monthIndex0] ?? '';
}

function nonDraft(quotes: MockQuote[]) {
  return quotes.filter((q) => q.status !== 'draft');
}

function approved(quotes: MockQuote[]) {
  return quotes.filter((q) => q.status === 'approved');
}

/** Orçamentos ainda sem decisão comercial (não aprovado / não rejeitado / não cancelado). */
function isOpenStatus(status: MockQuote['status']): boolean {
  return status === 'pending' || status === 'draft' || status === 'sent';
}

export function getDashboardMetrics(data: MockDashboardData): DashboardMetrics {
  const now = parseISO(data.now);
  const currentStart = monthStartUTC(now);
  const nextStart = addMonthsUTC(currentStart, 1);
  const lastStart = addMonthsUTC(currentStart, -1);

  const quotesThisMonthAll = data.quotes.filter((q) => inRange(q.createdAt, currentStart, nextStart));
  const quotesLastMonthAll = data.quotes.filter((q) => inRange(q.createdAt, lastStart, currentStart));

  const quotesThisMonth = nonDraft(quotesThisMonthAll);
  const quotesLastMonth = nonDraft(quotesLastMonthAll);

  const quotesThisMonthCount = quotesThisMonth.length;
  const quotesLastMonthCount = quotesLastMonth.length;

  const conversionThisMonth = safeRate(approved(quotesThisMonth).length, quotesThisMonthCount);
  const conversionLastMonth = safeRate(approved(quotesLastMonth).length, quotesLastMonthCount);

  const revenueThisMonth = approved(quotesThisMonth).reduce((acc, q) => acc + q.total, 0);
  const revenueLastMonth = approved(quotesLastMonth).reduce((acc, q) => acc + q.total, 0);

  const approvedThisMonthCount = approved(quotesThisMonth).length;
  const approvedLastMonthCount = approved(quotesLastMonth).length;

  const avgTicketThisMonth = safeRate(revenueThisMonth, approvedThisMonthCount);
  const avgTicketLastMonth = safeRate(revenueLastMonth, approvedLastMonthCount);

  const clientsThisMonth = data.clients
    .filter((c) => inRange(c.createdAt, currentStart, nextStart))
    .sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());

  // Series: last 30 days quote volume
  const start30 = addDaysUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)), -29);
  const days: Array<{ label: string; value: number; key: string }> = [];
  for (let i = 0; i < 30; i++) {
    const d = addDaysUTC(start30, i);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    days.push({ label: `${dd}/${mm}`, value: 0, key: dayKeyUTC(d) });
  }

  const dayIndex = new Map(days.map((d, idx) => [d.key, idx] as const));
  for (const q of nonDraft(data.quotes)) {
    const d = parseISO(q.createdAt);
    const key = dayKeyUTC(d);
    const idx = dayIndex.get(key);
    if (idx !== undefined) days[idx]!.value += 1;
  }

  // Series: last 6 months approved vs rejected
  const months: Array<{
    start: Date;
    end: Date;
    label: string;
    approved: number;
    rejected: number;
    open: number;
  }> = [];
  const start6 = addMonthsUTC(currentStart, -5);
  for (let i = 0; i < 6; i++) {
    const mStart = addMonthsUTC(start6, i);
    const mEnd = addMonthsUTC(mStart, 1);
    months.push({
      start: mStart,
      end: mEnd,
      label: shortMonthPtBR(mStart.getUTCMonth()),
      approved: 0,
      rejected: 0,
      open: 0,
    });
  }

  for (const q of data.quotes) {
    for (const m of months) {
      if (!inRange(q.createdAt, m.start, m.end)) continue;
      if (q.status === 'approved') m.approved += 1;
      else if (q.status === 'rejected') m.rejected += 1;
      else if (isOpenStatus(q.status)) m.open += 1;
      break;
    }
  }

  // Top clients by quoted total (this month)
  const totalsByClient = new Map<string, { id: string; name: string; total: number; quotes: number }>();
  for (const q of quotesThisMonth) {
    const existing = totalsByClient.get(q.clientId) ?? {
      id: q.clientId,
      name: q.clientName,
      total: 0,
      quotes: 0,
    };
    existing.total += q.total;
    existing.quotes += 1;
    totalsByClient.set(q.clientId, existing);
  }

  const topClientsThisMonth = Array.from(totalsByClient.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    kpis: {
      quotesThisMonth: quotesThisMonthCount,
      quotesLastMonth: quotesLastMonthCount,
      quotesMoMChangePct: safePctChange(quotesThisMonthCount, quotesLastMonthCount),

      conversionRate: conversionThisMonth,
      conversionRateLastMonth: conversionLastMonth,
      conversionRateDeltaPp:
        quotesLastMonthCount === 0 && quotesThisMonthCount > 0
          ? null
          : (conversionThisMonth - conversionLastMonth) * 100,

      estimatedRevenue: revenueThisMonth,
      estimatedRevenueLastMonth: revenueLastMonth,
      estimatedRevenueMoMChangePct: safePctChange(revenueThisMonth, revenueLastMonth),

      avgTicket: avgTicketThisMonth,
      avgTicketLastMonth: avgTicketLastMonth,
      avgTicketMoMChangePct: safePctChange(avgTicketThisMonth, avgTicketLastMonth),

      newClientsThisMonth: clientsThisMonth.length,
    },

    series: {
      quotesLast30Days: days.map((d) => ({ label: d.label, value: d.value })),
      approvedVsRejectedLast6Months: months.map((m) => ({
        label: m.label,
        approved: m.approved,
        rejected: m.rejected,
        open: m.open,
      })),
    },

    lists: {
      topClientsThisMonth,
      newClientsThisMonth: clientsThisMonth.slice(0, 6),
    },
  };
}
