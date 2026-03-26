/**
 * Agregação do dashboard no cliente (até existir algo como GET /api/v1/reports/dashboard).
 *
 * Campos usados por orçamento: `id`, `client_id`, `status`, `total`, `created_at` (fallback `updated_at`),
 * nome do cliente em `client.name`, `client_snapshot.name` ou resolvido por `client_id` na lista de clientes.
 *
 * Clientes: `id`, `name`, `created_at` (novos no mês).
 */
import type { Client, Quote } from '@/lib/api/services';
import type { MockClient, MockDashboardData, MockQuote, QuoteStatus } from '@/lib/mock/dashboard';
import { getDashboardMetrics } from '@/lib/mock/dashboardMetrics';
import type { DashboardMetrics } from '@/lib/mock/dashboardMetrics';

function normalizeQuoteStatus(status: string | undefined): QuoteStatus {
  const v = String(status ?? 'pending').toLowerCase();
  if (
    v === 'pending' ||
    v === 'draft' ||
    v === 'sent' ||
    v === 'approved' ||
    v === 'rejected' ||
    v === 'cancelled'
  ) {
    return v;
  }
  return 'pending';
}

function buildClientNameLookup(clients: Client[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of clients) {
    const id = c.id?.trim();
    if (!id) continue;
    const n = c.name?.trim();
    if (n) m.set(id, n);
  }
  return m;
}

function mapQuoteToMock(q: Quote, clientNameById: Map<string, string>): MockQuote {
  const cid = q.client_id?.trim() || '';
  const name =
    q.client?.name?.trim() ||
    q.client_snapshot?.name?.trim() ||
    (cid ? clientNameById.get(cid) : undefined) ||
    'Cliente';
  const created =
    q.created_at?.trim() ||
    q.updated_at?.trim() ||
    new Date(0).toISOString();
  return {
    id: q.id,
    clientId: cid || 'unknown',
    clientName: name,
    createdAt: created,
    status: normalizeQuoteStatus(q.status),
    total: Number(q.total ?? 0),
  };
}

function mapClientToMock(c: Client): MockClient {
  return {
    id: c.id,
    name: c.name?.trim() || 'Cliente',
    createdAt: c.created_at?.trim() || '',
  };
}

/**
 * Converte listas da API no formato esperado por `getDashboardMetrics`.
 * Use para alimentar o dashboard com dados reais até existir endpoint agregado.
 */
export function buildDashboardDataFromApi(
  quotes: Quote[],
  clients: Client[],
  referenceNow: Date = new Date()
): MockDashboardData {
  const clientNameById = buildClientNameLookup(clients);
  return {
    now: referenceNow.toISOString(),
    quotes: quotes.map((q) => mapQuoteToMock(q, clientNameById)),
    clients: clients.map(mapClientToMock),
  };
}

export function getDashboardMetricsFromApi(
  quotes: Quote[],
  clients: Client[],
  referenceNow?: Date
): DashboardMetrics {
  return getDashboardMetrics(buildDashboardDataFromApi(quotes, clients, referenceNow));
}
