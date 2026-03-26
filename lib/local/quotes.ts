import type { Quote, QuoteItem } from '@/lib/api/services';
import { getTenantIdSync } from '@/lib/auth/tenant';

const STORAGE_PREFIX = 'erp-dashboard.quotes';

function storageKey(): string {
  const tenantId = getTenantIdSync() ?? 'default';
  return `${STORAGE_PREFIX}.${tenantId}`;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function nowISO(): string {
  return new Date().toISOString();
}

function newId(): string {
  if (typeof crypto !== 'undefined') {
    const c = crypto as Crypto & { randomUUID?: () => string };
    if (typeof c.randomUUID === 'function') return c.randomUUID();
  }
  return `q_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function readAll(): Quote[] {
  if (typeof window === 'undefined') return [];
  const data = safeParse<Quote[]>(window.localStorage.getItem(storageKey()));
  return Array.isArray(data) ? data : [];
}

function writeAll(quotes: Quote[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(), JSON.stringify(quotes));
}

export const localQuoteStore = {
  list(): Quote[] {
    const items = readAll();
    return items.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  },

  getById(id: string): Quote | null {
    return readAll().find((q) => q.id === id) ?? null;
  },

  create(data: Partial<Quote>): Quote {
    const quotes = readAll();

    const items: QuoteItem[] = (data.items ?? []) as QuoteItem[];
    const total = Number(data.total ?? items.reduce((acc, it) => acc + Number(it.subtotal ?? 0), 0));

    const quote: Quote = {
      id: newId(),
      client_id: data.client_id ?? 'manual',
      client: data.client,
      status: data.status ?? 'pending',
      work_status: data.work_status,
      total,
      subtotal: data.subtotal,
      discount: data.discount,
      items,
      tenant_id: data.tenant_id,
      created_at: nowISO(),
      updated_at: nowISO(),

      payment_method: data.payment_method,
      payment_discount_enabled: data.payment_discount_enabled,
      discount_percent: data.discount_percent,
      payment_installments_enabled: data.payment_installments_enabled,
      installment_count: data.installment_count,

      client_snapshot: data.client_snapshot,
      environments: data.environments,
      notes: data.notes,
    };

    quotes.unshift(quote);
    writeAll(quotes);
    return quote;
  },

  update(id: string, patch: Partial<Quote>): Quote {
    const quotes = readAll();
    const idx = quotes.findIndex((q) => q.id === id);
    if (idx === -1) throw new Error('Quote not found');

    const current = quotes[idx];
    const updated: Quote = {
      ...current,
      ...patch,
      id: current.id,
      updated_at: nowISO(),
      items:
        patch.items !== undefined
          ? (patch.items as QuoteItem[])
          : current.items,
    };

    quotes[idx] = updated;
    writeAll(quotes);
    return updated;
  },

  delete(id: string): void {
    const quotes = readAll();
    writeAll(quotes.filter((q) => q.id !== id));
  },

  updateStatus(id: string, status: string): Quote {
    return this.update(id, { status });
  },
};
