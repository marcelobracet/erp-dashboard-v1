import { apiClient } from "./client";
import { API_CONFIG } from "./config";
import { getTenantIdSync } from '@/lib/auth/keycloak';

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
  address?: string;
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
}

export interface QuoteItem {
  id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  price: number;
  subtotal: number;
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
  list: () => apiClient.get<Client[]>(API_CONFIG.endpoints.clients.list),
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
  list: () => apiClient.get<Product[]>(API_CONFIG.endpoints.products.list),
  getById: (id: string) =>
    apiClient.get<Product>(API_CONFIG.endpoints.products.byId(id)),
  create: (data: Partial<Product>) =>
    apiClient.post<Product>(API_CONFIG.endpoints.products.list, withTenantId(data as Record<string, unknown>)),
  update: (id: string, data: Partial<Product>) =>
    apiClient.put<Product>(API_CONFIG.endpoints.products.byId(id), withTenantId(data as Record<string, unknown>)),
  delete: (id: string) =>
    apiClient.delete(API_CONFIG.endpoints.products.byId(id)),
  count: () =>
    apiClient.get<{ count: number }>(API_CONFIG.endpoints.products.count),
  export: () =>
    apiClient.get<Blob>(API_CONFIG.endpoints.products.export, {
      headers: {
        Accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    }),
};

export const quoteService = {
  list: () => apiClient.get<Quote[]>(API_CONFIG.endpoints.quotes.list),
  getById: (id: string) =>
    apiClient.get<Quote>(API_CONFIG.endpoints.quotes.byId(id)),
  create: (data: Partial<Quote>) =>
    apiClient.post<Quote>(API_CONFIG.endpoints.quotes.list, withTenantId(data as Record<string, unknown>)),
  update: (id: string, data: Partial<Quote>) =>
    apiClient.put<Quote>(API_CONFIG.endpoints.quotes.byId(id), withTenantId(data as Record<string, unknown>)),
  delete: (id: string) =>
    apiClient.delete(API_CONFIG.endpoints.quotes.byId(id)),
  count: () =>
    apiClient.get<{ count: number }>(API_CONFIG.endpoints.quotes.count),
  updateStatus: (id: string, status: string) =>
    apiClient.put<Quote>(API_CONFIG.endpoints.quotes.updateStatus(id), {
      status,
    }),
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
  list: () => apiClient.get<User[]>(API_CONFIG.endpoints.users.list),
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
