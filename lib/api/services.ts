import { apiClient } from "./client";
import { API_CONFIG } from "./config";
import { getTenantIdSync } from '@/lib/auth/tenant';
import { isLocalProductsEnabled, isLocalQuotesEnabled } from '@/lib/featureFlags';
import { quoteMatchesListTab, type QuoteListTab } from '@/lib/utils/quoteListTab';
import { localProductStore } from '@/lib/local/products';
import { localQuoteStore } from '@/lib/local/quotes';

function withTenantId<T extends Record<string, unknown>>(data: T): T {
  const tenantId = getTenantIdSync();
  if (!tenantId) return data;
  const current = (data as Record<string, unknown>)['tenant_id'];
  if (current) return data;
  return { ...data, tenant_id: tenantId };
}

// Types
export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string;
  document_type?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  is_active?: boolean;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  sku?: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;

  // Extra fields for marmoraria / orçamento
  category?: 'material' | 'service' | 'accessory' | string;
  unit?: 'm2' | 'm' | 'un' | 'kit' | 'chapa' | 'hora';
  pricing_rule?: 'por_area' | 'por_linear' | 'por_unidade';
  thickness_mm?: number;
  finish?: string;
  line?: string;
  waste_percent?: number;
  minimum_charge?: number;
  image_url?: string; // for now can be a data URL; later a bucket URL
  active?: boolean;
  is_active?: boolean;
}

export interface Quote {
  id: string;
  client_id: string;
  client?: Client;
  status: string;
  total: number;
  items?: QuoteItem[];
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;

  // Snapshot fields for printable proposal
  client_snapshot?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  environments?: Array<{
    id: string;
    name: string;
    item_ids: string[];
  }>;
  notes?: string;
}

export interface QuoteItem {
  id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  price: number;
  subtotal: number;

  // Calculation metadata
  unit?: Product['unit'];
  pricing_rule?: Product['pricing_rule'];
  width_m?: number;
  height_m?: number;
  length_m?: number;
  base_quantity?: number;
  charged_quantity?: number;
  note?: string;
  description?: string;

  // Grouping in printable proposal
  environment_id?: string;
  environment_name?: string;
}

export interface Settings {
  id: string;
  tenant_id?: string;
  key: string;
  value: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}

type ClientsListResponse = {
  clients: Client[];
  total?: number;
  limit?: number;
  offset?: number;
};

type ProductsListResponse = {
  products: Product[];
  total?: number;
  limit?: number;
  offset?: number;
};

export type QuoteListParams = {
  view?: string;
  limit?: number;
  offset?: number;
};

type QuotesListResponse = {
  quotes: Quote[];
  total?: number;
  limit?: number;
  offset?: number;
};

// ── Query helpers ─────────────────────────────────────────────────────────────
function buildUrl(base: string, params?: Record<string, string | number | undefined>): string {
  if (!params) return base;
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return query ? `${base}?${query}` : base;
}

function unwrapList<T>(res: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(res)) return res;
  return res.data ?? [];
}

function unwrapClientsList(res: Client[] | PaginatedResponse<Client> | ClientsListResponse): Client[] {
  if (Array.isArray(res)) return res;
  if ('clients' in res && Array.isArray((res as ClientsListResponse).clients)) return (res as ClientsListResponse).clients;
  return (res as PaginatedResponse<Client>).data ?? [];
}

function unwrapProductsList(res: Product[] | PaginatedResponse<Product> | ProductsListResponse): Product[] {
  if (Array.isArray(res)) return res;
  if ('products' in res && Array.isArray((res as ProductsListResponse).products)) return (res as ProductsListResponse).products;
  return (res as PaginatedResponse<Product>).data ?? [];
}

function unwrapQuotesList(res: Quote[] | PaginatedResponse<Quote> | QuotesListResponse): Quote[] {
  if (Array.isArray(res)) return res;
  if ('quotes' in res && Array.isArray((res as QuotesListResponse).quotes)) return (res as QuotesListResponse).quotes;
  return (res as PaginatedResponse<Quote>).data ?? [];
}

function isErrorEnvelope(res: unknown): res is { error?: unknown; message?: unknown } {
  if (!res || typeof res !== 'object') return false;
  return 'error' in (res as Record<string, unknown>) || 'message' in (res as Record<string, unknown>);
}

// Services
export const tenantService = {
  list: () => apiClient.get<Tenant[]>(API_CONFIG.endpoints.tenants.list),
  getById: (id: string) =>
    apiClient.get<Tenant>(API_CONFIG.endpoints.tenants.byId(id)),
  create: (data: Partial<Tenant>) =>
    apiClient.post<Tenant>(API_CONFIG.endpoints.tenants.list, data),
  update: (id: string, data: Partial<Tenant>) =>
    apiClient.put<Tenant>(API_CONFIG.endpoints.tenants.byId(id), data),
  delete: (id: string) =>
    apiClient.delete(API_CONFIG.endpoints.tenants.byId(id)),
  count: () =>
    apiClient.get<{ count: number }>(API_CONFIG.endpoints.tenants.count),
};

export const clientService = {
  list: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get<Client[] | PaginatedResponse<Client> | ClientsListResponse>(
      buildUrl(API_CONFIG.endpoints.clients.list, params)
    );
    return unwrapClientsList(res);
  },
  getById: (id: string) =>
    apiClient.get<Client>(API_CONFIG.endpoints.clients.byId(id)),
  create: (data: Partial<Client>) =>
    apiClient.post<Client>(API_CONFIG.endpoints.clients.list, withTenantId(data as Record<string, unknown>)),
  update: (id: string, data: Partial<Client>) =>
    apiClient.put<Client>(API_CONFIG.endpoints.clients.byId(id), withTenantId(data as Record<string, unknown>)),
  delete: (id: string) =>
    apiClient.delete(API_CONFIG.endpoints.clients.byId(id)),
  count: () =>
    apiClient.get<{ count: number }>(API_CONFIG.endpoints.clients.count),
};

export const productService = {
  list: async (params?: { page?: number; limit?: number; search?: string }) => {
    if (isLocalProductsEnabled()) return localProductStore.list();
    try {
      const res = await apiClient.get<Product[] | PaginatedResponse<Product> | ProductsListResponse>(
        buildUrl(API_CONFIG.endpoints.products.list, params)
      );
      return unwrapProductsList(res);
    } catch {
      return localProductStore.list();
    }
  },
  getById: (id: string) =>
    isLocalProductsEnabled()
      ? Promise.resolve(localProductStore.getById(id) as Product)
      : apiClient.get<Product>(API_CONFIG.endpoints.products.byId(id)),
  create: async (data: Partial<Product>) => {
    const payload = withTenantId(data as Record<string, unknown>);
    if (isLocalProductsEnabled()) return localProductStore.create(payload as Partial<Product>);
    try {
      return await apiClient.post<Product>(API_CONFIG.endpoints.products.list, payload);
    } catch {
      return localProductStore.create(payload as Partial<Product>);
    }
  },
  update: async (id: string, data: Partial<Product>) => {
    const payload = withTenantId(data as Record<string, unknown>);
    if (isLocalProductsEnabled()) return localProductStore.update(id, payload as Partial<Product>);
    try {
      return await apiClient.put<Product>(API_CONFIG.endpoints.products.byId(id), payload);
    } catch {
      return localProductStore.update(id, payload as Partial<Product>);
    }
  },
  delete: async (id: string) => {
    if (isLocalProductsEnabled()) {
      localProductStore.delete(id);
      return;
    }
    try {
      await apiClient.delete(API_CONFIG.endpoints.products.byId(id));
    } catch {
      localProductStore.delete(id);
    }
  },
  count: () =>
    apiClient.get<{ count: number }>(API_CONFIG.endpoints.products.count),
  export: () =>
    isLocalProductsEnabled()
      ? Promise.resolve(localProductStore.exportCSV())
      : apiClient.get<Blob>(API_CONFIG.endpoints.products.export, {
          headers: {
            Accept:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        }),
};

export const quoteService = {
  list: async (params?: QuoteListParams) => {
    if (isLocalQuotesEnabled()) {
      const all = localQuoteStore.list();
      const view = params?.view?.trim();
      if (view && view !== 'todos') {
        return all.filter((q) => quoteMatchesListTab(q, view as QuoteListTab));
      }
      return all;
    }
    try {
      const url = buildUrl(API_CONFIG.endpoints.quotes.list, {
        view: params?.view,
        limit: params?.limit,
        offset: params?.offset,
      });
      const res = await apiClient.get<
        | Quote[]
        | PaginatedResponse<Quote>
        | QuotesListResponse
        | { error?: string; message?: string }
      >(url);

      if (!Array.isArray(res) && isErrorEnvelope(res) && !('quotes' in (res as any)) && !('data' in (res as any))) {
        const msg = (res as any).error ?? (res as any).message;
        if (typeof msg === 'string' && msg.trim()) throw new Error(msg);
      }

      return unwrapQuotesList(res as Quote[] | PaginatedResponse<Quote> | QuotesListResponse);
    } catch {
      const all = localQuoteStore.list();
      const view = params?.view?.trim();
      if (view && view !== 'todos') {
        return all.filter((q) => quoteMatchesListTab(q, view as QuoteListTab));
      }
      return all;
    }
  },
  getById: async (id: string) => {
    if (isLocalQuotesEnabled()) return localQuoteStore.getById(id) as Quote;
    try {
      const res = await apiClient.get<
        | Quote
        | { quote: Quote }
        | { error?: string; message?: string }
      >(API_CONFIG.endpoints.quotes.byId(id));

      if (isErrorEnvelope(res) && !('quote' in (res as any))) {
        const msg = (res as any).error ?? (res as any).message;
        if (typeof msg === 'string' && msg.trim()) throw new Error(msg);
      }

      if (res && typeof res === 'object' && 'quote' in (res as any) && (res as any).quote) {
        return (res as any).quote as Quote;
      }

      return res as Quote;
    } catch {
      return localQuoteStore.getById(id) as Quote;
    }
  },
  create: async (data: Partial<Quote>) => {
    const payload = withTenantId(data as Record<string, unknown>);
    if (isLocalQuotesEnabled()) return localQuoteStore.create(payload as Partial<Quote>);
    try {
      return await apiClient.post<Quote>(API_CONFIG.endpoints.quotes.list, payload);
    } catch {
      return localQuoteStore.create(payload as Partial<Quote>);
    }
  },
  update: async (id: string, data: Partial<Quote>) => {
    const payload = withTenantId(data as Record<string, unknown>);
    if (isLocalQuotesEnabled()) return localQuoteStore.update(id, payload as Partial<Quote>);
    try {
      return await apiClient.put<Quote>(API_CONFIG.endpoints.quotes.byId(id), payload);
    } catch {
      return localQuoteStore.update(id, payload as Partial<Quote>);
    }
  },
  delete: async (id: string) => {
    if (isLocalQuotesEnabled()) {
      localQuoteStore.delete(id);
      return;
    }
    try {
      await apiClient.delete(API_CONFIG.endpoints.quotes.byId(id));
    } catch {
      localQuoteStore.delete(id);
    }
  },
  count: () =>
    apiClient.get<{ count: number }>(API_CONFIG.endpoints.quotes.count),
  updateStatus: async (id: string, status: string) => {
    if (isLocalQuotesEnabled()) return localQuoteStore.updateStatus(id, status);
    try {
      return await apiClient.put<Quote>(API_CONFIG.endpoints.quotes.updateStatus(id), {
        status,
      });
    } catch {
      return localQuoteStore.updateStatus(id, status);
    }
  },
};

export interface TenantSettingsResponse {
  tenant_id: string;
  settings: {
    company_name?: string;
    company_email?: string;
    company_phone?: string;
    company_address?: string;
    company_city?: string;
    company_state?: string;
    company_zip?: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

export const settingsService = {
  get: (tenantId?: string) => {
    const effectiveTenantId = tenantId ?? getTenantIdSync() ?? undefined;
    const endpoint = effectiveTenantId
      ? `${API_CONFIG.endpoints.settings.get}?tenant_id=${effectiveTenantId}`
      : API_CONFIG.endpoints.settings.get.split("?")[0]; // Remove query params if no tenantId
    return apiClient.get<TenantSettingsResponse>(endpoint);
  },
  update: (data: Partial<Settings>) =>
    apiClient.put<Settings>(API_CONFIG.endpoints.settings.update, withTenantId(data as Record<string, unknown>)),
};

export const userService = {
  list: async (params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get<User[] | PaginatedResponse<User>>(
      buildUrl(API_CONFIG.endpoints.users.list, params)
    );
    return unwrapList(res);
  },
  getById: (id: string) =>
    apiClient.get<User>(API_CONFIG.endpoints.users.byId(id)),
  update: (id: string, data: Partial<User>) =>
    apiClient.put<User>(API_CONFIG.endpoints.users.byId(id), data),
  delete: (id: string) => apiClient.delete(API_CONFIG.endpoints.users.byId(id)),
  count: () =>
    apiClient.get<{ count: number }>(API_CONFIG.endpoints.users.count),
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type RoadmapItemStatus = 'backlog' | 'in_progress' | 'done';

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: RoadmapItemStatus;
  created_at?: string;
  updated_at?: string;
}

export const roadmapService = {
  listItems: async () => {
    const res = await apiClient.get<RoadmapItem[] | { items?: RoadmapItem[] } | null>(
      API_CONFIG.endpoints.roadmap.items
    );
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object' && Array.isArray((res as { items?: RoadmapItem[] }).items)) {
      return (res as { items: RoadmapItem[] }).items;
    }
    return [];
  },
  createItem: (data: { title: string; description: string; status: RoadmapItemStatus }) =>
    apiClient.post<RoadmapItem>(API_CONFIG.endpoints.roadmap.items, data),
  updateItem: (id: string, data: Partial<Pick<RoadmapItem, 'title' | 'description' | 'status'>>) =>
    apiClient.put<RoadmapItem>(API_CONFIG.endpoints.roadmap.itemById(id), data),
  deleteItem: (id: string) =>
    apiClient.delete<void>(API_CONFIG.endpoints.roadmap.itemById(id)),
  submitSuggestion: (data: { title: string; description: string }) =>
    apiClient.post<{ message?: string }>(API_CONFIG.endpoints.roadmap.suggestions, data),
};
