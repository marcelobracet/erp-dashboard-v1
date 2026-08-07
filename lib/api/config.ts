export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  endpoints: {
    auth: {
      login: "/api/v1/auth/login",
      refresh: "/api/v1/auth/refresh",
      provision: "/api/v1/auth/provision",
    },
    users: {
      profile: "/api/v1/users/profile",
      register: "/api/v1/auth/register",
      list: "/api/v1/users",
      count: "/api/v1/users/count",
      byId: (id: string) => `/api/v1/users/${id}`,
    },
    tenants: {
      list: "/api/v1/tenants",
      count: "/api/v1/tenants/count",
      byId: (id: string) => `/api/v1/tenants/${id}`,
    },
    clients: {
      list: "/api/v1/clients",
      count: "/api/v1/clients/count",
      byId: (id: string) => `/api/v1/clients/${id}`,
    },
    products: {
      list: "/api/v1/products",
      count: "/api/v1/products/count",
      byId: (id: string) => `/api/v1/products/${id}`,
      export: "/api/v1/reports/export",
    },
    quotes: {
      list: "/api/v1/quotes",
      count: "/api/v1/quotes/count",
      byId: (id: string) => `/api/v1/quotes/${id}`,
      itemsByQuoteId: (id: string) => `/api/v1/quotes/${id}/items`,
      lineItemsByQuoteId: (id: string) => `/api/v1/quotes/${id}/line-items`,
      updateStatus: (id: string) => `/api/v1/quotes/${id}/status`,
    },
    settings: {
      get: "/api/v1/settings",
      update: "/api/v1/settings",
    },
    reports: {
      export: "/api/v1/reports/export",
    },
    uploads: {
      sign: "/api/v1/uploads/sign",
      readUrl: "/api/v1/uploads/read-url",
    },
    roadmap: {
      items: "/api/v1/roadmap",
      itemById: (id: string) => `/api/v1/roadmap/${id}`,
      suggestions: "/api/v1/roadmap/suggestions",
    },
  },
} as const;

export const API_TIMEOUT = 30000;
