import type { Product } from '@/lib/api/services';
import { getTenantIdSync } from '@/lib/auth/tenant';

const STORAGE_PREFIX = 'erp-dashboard.products';

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
  return `p_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function readAll(): Product[] {
  if (typeof window === 'undefined') return [];
  const data = safeParse<Product[]>(window.localStorage.getItem(storageKey()));
  return Array.isArray(data) ? data : [];
}

function writeAll(products: Product[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(), JSON.stringify(products));
}

export const localProductStore = {
  list(): Product[] {
    const items = readAll();
    return items.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  },

  getById(id: string): Product | null {
    return readAll().find((p) => p.id === id) ?? null;
  },

  create(data: Partial<Product>): Product {
    const products = readAll();

    const product: Product = {
      id: newId(),
      name: String(data.name ?? '').trim() || 'Sem nome',
      description: data.description,
      sku: data.sku,
      price: Number(data.price ?? 0),
      stock: data.stock ?? 0,
      tenant_id: data.tenant_id,
      created_at: nowISO(),
      updated_at: nowISO(),

      // Extra fields (marmoraria)
      category: data.category,
      unit: data.unit,
      pricing_rule: data.pricing_rule,
      thickness_mm: data.thickness_mm,
      finish: data.finish,
      line: data.line,
      waste_percent: data.waste_percent,
      minimum_charge: data.minimum_charge,
      image_url: data.image_url,
      active: data.active ?? true,
    };

    products.unshift(product);
    writeAll(products);
    return product;
  },

  update(id: string, patch: Partial<Product>): Product {
    const products = readAll();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Product not found');

    const current = products[idx];
    const updated: Product = {
      ...current,
      ...patch,
      id: current.id,
      updated_at: nowISO(),
    };

    products[idx] = updated;
    writeAll(products);
    return updated;
  },

  delete(id: string): void {
    const products = readAll();
    writeAll(products.filter((p) => p.id !== id));
  },

  exportCSV(): Blob {
    const products = this.list();
    const header = [
      'id',
      'name',
      'sku',
      'category',
      'unit',
      'pricing_rule',
      'price',
      'stock',
      'thickness_mm',
      'finish',
      'line',
      'waste_percent',
      'minimum_charge',
      'active',
      'created_at',
      'updated_at',
    ];

    const rows = products.map((p) =>
      header
        .map((k) => {
          const v = (p as unknown as Record<string, unknown>)[k];
          const s = v == null ? '' : String(v);
          const escaped = s.replaceAll('"', '""');
          return `"${escaped}"`;
        })
        .join(',')
    );

    const csv = [header.join(','), ...rows].join('\n');
    return new Blob([csv], { type: 'text/csv;charset=utf-8' });
  },
};
