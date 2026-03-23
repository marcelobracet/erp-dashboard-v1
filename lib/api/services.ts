/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "./client";
import { API_CONFIG } from "./config";
import { getTenantIdSync } from "@/lib/auth/tenant";
import {
  isLocalProductsEnabled,
  isLocalQuotesEnabled,
} from "@/lib/featureFlags";
import { localProductStore } from "@/lib/local/products";
import { localQuoteStore } from "@/lib/local/quotes";

function withTenantId<T extends Record<string, unknown>>(data: T): T {
  const tenantId = getTenantIdSync();
  if (!tenantId) return data;
  const current = (data as Record<string, unknown>)["tenant_id"];
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
  category?: "material" | "service" | "accessory" | string;
  unit?: "m2" | "m" | "un" | "kit" | "chapa" | "hora";
  pricing_rule?: "por_area" | "por_linear" | "por_unidade";
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
  unit?: Product["unit"];
  pricing_rule?: Product["pricing_rule"];
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

type QuotesListResponse = {
  quotes: Quote[];
  total?: number;
  limit?: number;
  offset?: number;
};

// ── Query helpers ─────────────────────────────────────────────────────────────
function buildUrl(
  base: string,
  params?: Record<string, string | number | undefined>,
): string {
  if (!params) return base;
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join("&");
  return query ? `${base}?${query}` : base;
}

function unwrapList<T>(res: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(res)) return res;
  return res.data ?? [];
}

function unwrapClientsList(
  res: Client[] | PaginatedResponse<Client> | ClientsListResponse,
): Client[] {
  if (Array.isArray(res)) return res;
  if ("clients" in res && Array.isArray((res as ClientsListResponse).clients))
    return (res as ClientsListResponse).clients;
  return (res as PaginatedResponse<Client>).data ?? [];
}

function unwrapProductsList(
  res: Product[] | PaginatedResponse<Product> | ProductsListResponse,
): Product[] {
  if (Array.isArray(res)) return res;
  if (
    "products" in res &&
    Array.isArray((res as ProductsListResponse).products)
  )
    return (res as ProductsListResponse).products;
  return (res as PaginatedResponse<Product>).data ?? [];
}

function unwrapQuotesList(
  res: Quote[] | PaginatedResponse<Quote> | QuotesListResponse,
): Quote[] {
  if (Array.isArray(res)) return res;
  if ("quotes" in res && Array.isArray((res as QuotesListResponse).quotes))
    return (res as QuotesListResponse).quotes;
  return (res as PaginatedResponse<Quote>).data ?? [];
}

/** Maps API product JSON (snake_case, is_active) to dashboard `Product`. */
function normalizeProduct(raw: unknown): Product {
  if (!raw || typeof raw !== "object") {
    throw new Error("Resposta inválida da API");
  }
  const r = raw as Record<string, unknown>;
  const isActive = r.is_active === true || r.active === true;
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    description: r.description != null ? String(r.description) : undefined,
    price: Number(r.price ?? 0),
    stock: r.stock != null ? Number(r.stock) : undefined,
    sku: r.sku != null ? String(r.sku) : undefined,
    tenant_id: r.tenant_id != null ? String(r.tenant_id) : undefined,
    created_at: r.created_at != null ? String(r.created_at) : undefined,
    updated_at: r.updated_at != null ? String(r.updated_at) : undefined,
    category: (r.category as Product["category"]) ?? undefined,
    image_url: r.image_url != null ? String(r.image_url) : undefined,
    active: isActive,
    is_active: r.is_active === true,
    unit: r.unit as Product["unit"],
    pricing_rule: r.pricing_rule as Product["pricing_rule"],
    thickness_mm: r.thickness_mm != null ? Number(r.thickness_mm) : undefined,
    finish: r.finish != null ? String(r.finish) : undefined,
    line: r.line != null ? String(r.line) : undefined,
    waste_percent:
      r.waste_percent != null ? Number(r.waste_percent) : undefined,
    minimum_charge:
      r.minimum_charge != null ? Number(r.minimum_charge) : undefined,
  };
}

/** Body for POST /api/v1/products — tenant vem do JWT (sem tenant_id no JSON). */
function buildCreateProductApiBody(
  data: Partial<Product>,
): Record<string, unknown> {
  const name = String(data.name ?? "").trim();
  const sku = String(data.sku ?? "").trim();
  const category = String(data.category ?? "").trim();
  const price = Number(data.price);
  const stock = data.stock != null ? Math.trunc(Number(data.stock)) : 0;
  const body: Record<string, unknown> = {
    name,
    sku,
    category,
    price,
    stock,
  };
  const desc = data.description?.trim();
  if (desc) body.description = desc;
  const img = data.image_url?.trim();
  if (img) body.image_url = img;
  return body;
}

function buildUpdateProductApiBody(
  data: Partial<Product>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.description !== undefined) body.description = data.description;
  if (data.price !== undefined) body.price = data.price;
  if (data.stock !== undefined) body.stock = Math.trunc(Number(data.stock));
  if (data.sku !== undefined) body.sku = data.sku;
  if (data.category !== undefined) body.category = data.category;
  if (data.image_url !== undefined) body.image_url = data.image_url;
  if (data.active !== undefined) body.is_active = data.active;
  else if (data.is_active !== undefined) body.is_active = data.is_active;
  return body;
}

function isErrorEnvelope(
  res: unknown,
): res is { error?: unknown; message?: unknown } {
  if (!res || typeof res !== "object") return false;
  return (
    "error" in (res as Record<string, unknown>) ||
    "message" in (res as Record<string, unknown>)
  );
}

function parseClientSnapshot(raw: unknown): Quote["client_snapshot"] {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const name = o.name != null ? String(o.name) : "";
  if (!name) return undefined;
  return {
    name,
    phone: o.phone != null ? String(o.phone) : undefined,
    email: o.email != null ? String(o.email) : undefined,
    address: o.address != null ? String(o.address) : undefined,
  };
}

function parseEnvironments(raw: unknown): Quote["environments"] {
  const arr = coerceJsonArray(raw);
  if (!arr) return undefined;
  return arr.map((e) => {
    const o = e as Record<string, unknown>;
    return {
      id: String(o.id ?? ""),
      name: String(o.name ?? ""),
      item_ids: Array.isArray(o.item_ids) ? o.item_ids.map(String) : [],
    };
  });
}

function coerceJsonArray(raw: unknown): unknown[] | undefined {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function quotePayloadLayers(raw: unknown): Record<string, unknown>[] {
  const layers: Record<string, unknown>[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return layers;
  const root = raw as Record<string, unknown>;
  layers.push(root);
  const d = root.data;
  if (d && typeof d === "object" && !Array.isArray(d)) {
    layers.push(d as Record<string, unknown>);
    const dq = (d as Record<string, unknown>).quote;
    if (dq && typeof dq === "object" && !Array.isArray(dq)) {
      layers.push(dq as Record<string, unknown>);
    }
  }
  const rq = root.quote;
  if (rq && typeof rq === "object" && !Array.isArray(rq)) {
    layers.push(rq as Record<string, unknown>);
  }
  return layers;
}

function pickPrimaryQuoteRecord(
  layers: Record<string, unknown>[],
): Record<string, unknown> {
  for (let i = layers.length - 1; i >= 0; i--) {
    const L = layers[i];
    if (L && typeof L.id === "string" && L.id.length > 0) return L;
  }
  return layers[0] ?? {};
}

const QUOTE_ITEM_ARRAY_KEYS = [
  "items",
  "quote_items",
  "line_items",
  "lines",
  "Items",
  "QuoteItems",
] as const;

function extractRawQuoteItemsArray(layer: Record<string, unknown>): unknown[] {
  for (const k of QUOTE_ITEM_ARRAY_KEYS) {
    if (!(k in layer)) continue;
    const arr = coerceJsonArray(layer[k]);
    if (arr !== undefined) return arr;
  }
  return [];
}

/** Line items sometimes ship only under each environment in the API payload. */
function extractRawItemsFromEnvironmentsJson(raw: unknown): unknown[] {
  const envs = coerceJsonArray(raw);
  if (!envs) return [];
  const out: unknown[] = [];
  for (const env of envs) {
    if (!env || typeof env !== "object") continue;
    const inner = coerceJsonArray((env as Record<string, unknown>).items);
    if (inner) out.push(...inner);
  }
  return out;
}

function normalizeQuoteItemFromApi(raw: unknown): QuoteItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? "");
  if (!id) return null;

  let product: Product | undefined;
  if (
    o.product != null &&
    typeof o.product === "object" &&
    !Array.isArray(o.product)
  ) {
    try {
      product = normalizeProduct(o.product);
    } catch {
      product = undefined;
    }
  }

  const product_id = String(o.product_id ?? o.productId ?? product?.id ?? "");
  const quantity = Number(o.quantity ?? o.qty ?? 1);
  const price = Number(o.price ?? o.unit_price ?? o.unitPrice ?? 0);
  const subtotal = Number(
    o.subtotal ?? o.line_total ?? o.total ?? price * quantity,
  );

  return {
    id,
    product_id,
    product,
    quantity: Number.isFinite(quantity) ? quantity : 1,
    price: Number.isFinite(price) ? price : 0,
    subtotal: Number.isFinite(subtotal) ? subtotal : 0,
    unit: (o.unit as QuoteItem["unit"]) ?? product?.unit,
    pricing_rule:
      (o.pricing_rule as QuoteItem["pricing_rule"]) ?? product?.pricing_rule,
    width_m:
      o.width_m != null
        ? Number(o.width_m)
        : o.width != null
          ? Number(o.width)
          : undefined,
    height_m:
      o.height_m != null
        ? Number(o.height_m)
        : o.height != null
          ? Number(o.height)
          : undefined,
    length_m:
      o.length_m != null
        ? Number(o.length_m)
        : o.length != null
          ? Number(o.length)
          : undefined,
    base_quantity:
      o.base_quantity != null ? Number(o.base_quantity) : undefined,
    charged_quantity:
      o.charged_quantity != null ? Number(o.charged_quantity) : undefined,
    note: o.note != null ? String(o.note) : undefined,
    description: o.description != null ? String(o.description) : undefined,
    environment_id:
      o.environment_id != null
        ? String(o.environment_id)
        : o.environmentId != null
          ? String(o.environmentId)
          : undefined,
    environment_name:
      o.environment_name != null
        ? String(o.environment_name)
        : o.environmentName != null
          ? String(o.environmentName)
          : undefined,
  };
}

/** Merges items from every payload layer; later layers override ids (inner quote wins). */
function parseQuoteItemsAcrossLayers(
  layers: Record<string, unknown>[],
): QuoteItem[] {
  const map = new Map<string, QuoteItem>();
  for (const layer of layers) {
    for (const raw of extractRawItemsFromEnvironmentsJson(layer.environments)) {
      const it = normalizeQuoteItemFromApi(raw);
      if (it) map.set(it.id, it);
    }
    for (const raw of extractRawQuoteItemsArray(layer)) {
      const it = normalizeQuoteItemFromApi(raw);
      if (it) map.set(it.id, it);
    }
  }
  return Array.from(map.values());
}

const LINE_ITEMS_STORAGE_PREFIX = "erp.quote.lineItems.v1:";

function stashQuoteLineItems(quoteId: string, items: QuoteItem[]): void {
  if (typeof window === "undefined" || !quoteId || !items.length) return;
  try {
    window.localStorage.setItem(
      LINE_ITEMS_STORAGE_PREFIX + quoteId,
      JSON.stringify(items),
    );
  } catch {
    /* quota / private mode */
  }
}

function readStashedQuoteLineItems(quoteId: string): QuoteItem[] {
  if (typeof window === "undefined" || !quoteId) return [];
  try {
    const raw = window.localStorage.getItem(
      LINE_ITEMS_STORAGE_PREFIX + quoteId,
    );
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => normalizeQuoteItemFromApi(row))
      .filter((x): x is QuoteItem => x != null);
  } catch {
    return [];
  }
}

function clearStashedQuoteLineItems(quoteId: string): void {
  if (typeof window === "undefined" || !quoteId) return;
  try {
    window.localStorage.removeItem(LINE_ITEMS_STORAGE_PREFIX + quoteId);
  } catch {
    /* */
  }
}

function quoteItemsResponseToLayer(raw: unknown): Record<string, unknown> {
  if (Array.isArray(raw)) return { items: raw };
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.items)) return { items: o.items };
    if (Array.isArray(o.data)) return { items: o.data };
    if (Array.isArray(o.quote_items)) return { quote_items: o.quote_items };
    if (Array.isArray(o.lines)) return { lines: o.lines };
  }
  return {};
}

async function tryFetchQuoteLineItemsRemote(
  quoteId: string,
): Promise<QuoteItem[]> {
  const urls = [
    API_CONFIG.endpoints.quotes.itemsByQuoteId(quoteId),
    API_CONFIG.endpoints.quotes.lineItemsByQuoteId(quoteId),
  ];
  for (const url of urls) {
    try {
      const raw = await apiClient.get<unknown>(url);
      const items = parseQuoteItemsAcrossLayers([
        quoteItemsResponseToLayer(raw),
      ]);
      if (items.length) return items;
    } catch {
      /* 404 / not implemented */
    }
  }
  const base = API_CONFIG.endpoints.quotes.byId(quoteId);
  for (const suffix of [
    "?include=items",
    "?expand=items",
    "?relations=items",
  ]) {
    try {
      const raw = await apiClient.get<unknown>(`${base}${suffix}`);
      const items = parseQuoteItemsAcrossLayers(quotePayloadLayers(raw));
      if (items.length) return items;
    } catch {
      /* */
    }
  }
  return [];
}

function quoteNeedsRemoteLineItems(q: Quote): boolean {
  if (q.items?.length) return false;
  return q.environments?.some((e) => e.item_ids.length > 0) ?? false;
}

/** When GET /quotes/:id omits `items`, use browser cache (POST payload) or optional line-item endpoints. */
async function hydrateQuoteLineItems(
  quoteId: string,
  q: Quote,
): Promise<Quote> {
  if (q.items?.length) {
    stashQuoteLineItems(q.id, q.items);
    return q;
  }
  const cached = readStashedQuoteLineItems(quoteId);
  if (cached.length) return { ...q, items: cached };
  if (quoteNeedsRemoteLineItems(q)) {
    const remote = await tryFetchQuoteLineItemsRemote(quoteId);
    if (remote.length) {
      stashQuoteLineItems(q.id, remote);
      return { ...q, items: remote };
    }
  }
  return q;
}

/** Maps API quote JSON to dashboard `Quote` (total_value → total, JSON fields). */
function normalizeQuoteFromApi(raw: unknown): Quote {
  const layers = quotePayloadLayers(raw);
  const r = pickPrimaryQuoteRecord(layers);
  if (!r || typeof r !== "object") {
    throw new Error("Resposta inválida da API");
  }
  const total = Number(r.total ?? r.total_value ?? 0);
  const mergedItems = parseQuoteItemsAcrossLayers(layers);
  return {
    id: String(r.id ?? ""),
    client_id: String(r.client_id ?? ""),
    status: String(r.status ?? ""),
    total,
    tenant_id: r.tenant_id != null ? String(r.tenant_id) : undefined,
    created_at: r.created_at != null ? String(r.created_at) : undefined,
    updated_at: r.updated_at != null ? String(r.updated_at) : undefined,
    notes: r.notes != null ? String(r.notes) : undefined,
    client_snapshot: parseClientSnapshot(r.client_snapshot),
    environments: parseEnvironments(r.environments),
    items: mergedItems.length > 0 ? mergedItems : undefined,
  };
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
  list: async (params?: {
    page?: number;
    limit?: number;
    offset?: number;
    search?: string;
  }) => {
    const res = await apiClient.get<
      Client[] | PaginatedResponse<Client> | ClientsListResponse
    >(buildUrl(API_CONFIG.endpoints.clients.list, params));
    return unwrapClientsList(res);
  },
  getById: (id: string) =>
    apiClient.get<Client>(API_CONFIG.endpoints.clients.byId(id)),
  create: (data: Partial<Client>) =>
    apiClient.post<Client>(
      API_CONFIG.endpoints.clients.list,
      withTenantId(data as Record<string, unknown>),
    ),
  update: (id: string, data: Partial<Client>) =>
    apiClient.put<Client>(
      API_CONFIG.endpoints.clients.byId(id),
      withTenantId(data as Record<string, unknown>),
    ),
  delete: (id: string) =>
    apiClient.delete(API_CONFIG.endpoints.clients.byId(id)),
  count: () =>
    apiClient.get<{ count: number }>(API_CONFIG.endpoints.clients.count),
};

export const productService = {
  list: async (params?: { page?: number; limit?: number; search?: string }) => {
    if (isLocalProductsEnabled()) return localProductStore.list();
    try {
      const res = await apiClient.get<
        Product[] | PaginatedResponse<Product> | ProductsListResponse
      >(buildUrl(API_CONFIG.endpoints.products.list, params));
      return unwrapProductsList(res).map((p) => normalizeProduct(p));
    } catch {
      return localProductStore.list();
    }
  },
  getById: async (id: string) => {
    if (isLocalProductsEnabled()) {
      return localProductStore.getById(id) as Product;
    }
    const raw = await apiClient.get<unknown>(
      API_CONFIG.endpoints.products.byId(id),
    );
    return normalizeProduct(raw);
  },
  create: async (data: Partial<Product>) => {
    if (isLocalProductsEnabled()) {
      const payload = withTenantId(data as Record<string, unknown>);
      return localProductStore.create(payload as Partial<Product>);
    }
    const body = buildCreateProductApiBody(data);
    const raw = await apiClient.post<unknown>(
      API_CONFIG.endpoints.products.list,
      body,
    );
    return normalizeProduct(raw);
  },
  update: async (id: string, data: Partial<Product>) => {
    if (isLocalProductsEnabled()) {
      const payload = withTenantId(data as Record<string, unknown>);
      return localProductStore.update(id, payload as Partial<Product>);
    }
    const body = buildUpdateProductApiBody(data);
    const raw = await apiClient.put<unknown>(
      API_CONFIG.endpoints.products.byId(id),
      body,
    );
    return normalizeProduct(raw);
  },
  delete: async (id: string) => {
    if (isLocalProductsEnabled()) {
      localProductStore.delete(id);
      return;
    }
    await apiClient.delete(API_CONFIG.endpoints.products.byId(id));
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
  list: async () => {
    if (isLocalQuotesEnabled()) return localQuoteStore.list();
    try {
      const res = await apiClient.get<
        | Quote[]
        | PaginatedResponse<Quote>
        | QuotesListResponse
        | { error?: string; message?: string }
      >(API_CONFIG.endpoints.quotes.list);

      if (
        !Array.isArray(res) &&
        isErrorEnvelope(res) &&
        !("quotes" in (res as any)) &&
        !("data" in (res as any))
      ) {
        const msg = (res as any).error ?? (res as any).message;
        if (typeof msg === "string" && msg.trim()) throw new Error(msg);
      }

      return unwrapQuotesList(
        res as Quote[] | PaginatedResponse<Quote> | QuotesListResponse,
      ).map((q) => normalizeQuoteFromApi(q));
    } catch {
      return localQuoteStore.list();
    }
  },
  getById: async (id: string) => {
    if (isLocalQuotesEnabled()) return localQuoteStore.getById(id) as Quote;
    try {
      const res = await apiClient.get<
        Quote | { quote: Quote } | { error?: string; message?: string }
      >(API_CONFIG.endpoints.quotes.byId(id));

      if (
        isErrorEnvelope(res) &&
        !("quote" in (res as any)) &&
        !("data" in (res as any))
      ) {
        const msg = (res as any).error ?? (res as any).message;
        if (typeof msg === "string" && msg.trim()) throw new Error(msg);
      }

      const q = normalizeQuoteFromApi(res);
      return hydrateQuoteLineItems(String(id), q);
    } catch {
      return localQuoteStore.getById(id) as Quote;
    }
  },
  create: async (data: Partial<Quote>) => {
    if (isLocalQuotesEnabled()) {
      return localQuoteStore.create(
        withTenantId(data as Record<string, unknown>) as Partial<Quote>,
      );
    }
    const body = { ...(data as Record<string, unknown>) };
    delete body.tenant_id;
    const raw = await apiClient.post<unknown>(
      API_CONFIG.endpoints.quotes.list,
      body,
    );
    const q = normalizeQuoteFromApi(raw);
    const sentItems = Array.isArray(data.items)
      ? (data.items as QuoteItem[])
      : [];
    const mergedItems = q.items?.length ? q.items : sentItems;
    if (mergedItems.length) stashQuoteLineItems(String(q.id), mergedItems);
    return { ...q, items: mergedItems.length ? mergedItems : undefined };
  },
  update: async (id: string, data: Partial<Quote>) => {
    if (isLocalQuotesEnabled()) {
      return localQuoteStore.update(
        id,
        withTenantId(data as Record<string, unknown>) as Partial<Quote>,
      );
    }
    const body = { ...(data as Record<string, unknown>) };
    delete body.tenant_id;
    const raw = await apiClient.put<unknown>(
      API_CONFIG.endpoints.quotes.byId(id),
      body,
    );
    return normalizeQuoteFromApi(raw);
  },
  delete: async (id: string) => {
    if (isLocalQuotesEnabled()) {
      localQuoteStore.delete(id);
      clearStashedQuoteLineItems(id);
      return;
    }
    await apiClient.delete(API_CONFIG.endpoints.quotes.byId(id));
    clearStashedQuoteLineItems(id);
  },
  count: () =>
    apiClient.get<{ count: number }>(API_CONFIG.endpoints.quotes.count),
  updateStatus: async (id: string, status: string) => {
    if (isLocalQuotesEnabled()) return localQuoteStore.updateStatus(id, status);
    try {
      return await apiClient.put<Quote>(
        API_CONFIG.endpoints.quotes.updateStatus(id),
        {
          status,
        },
      );
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
      : API_CONFIG.endpoints.settings.get;
    return apiClient.get<TenantSettingsResponse>(endpoint);
  },
  /** Body must match API: { tenant_id, settings: Record<string, string> }. */
  update: (settingsMap: Record<string, string>, tenantId?: string) => {
    const tenant_id = tenantId ?? getTenantIdSync() ?? undefined;
    if (!tenant_id?.trim()) {
      throw new Error("tenant_id é necessário para salvar configurações");
    }
    return apiClient.put<TenantSettingsResponse>(
      API_CONFIG.endpoints.settings.update,
      {
        tenant_id,
        settings: settingsMap,
      },
    );
  },
};

export const userService = {
  list: async (params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get<User[] | PaginatedResponse<User>>(
      buildUrl(API_CONFIG.endpoints.users.list, params),
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
