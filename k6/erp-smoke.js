import http from 'k6/http';
import { check, sleep } from 'k6';

const API_URL = (__ENV.API_URL || 'http://localhost:8080').replace(/\/$/, '');
const EMAIL = __ENV.USER_EMAIL || '';
const PASSWORD = __ENV.USER_PASSWORD || '';
const TENANT_ID = __ENV.TENANT_ID || '';

function json(res) {
  try {
    return res.json();
  } catch {
    return null;
  }
}

function login() {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      'Missing credentials: set USER_EMAIL and USER_PASSWORD env vars to run authenticated requests.'
    );
  }

  const url = `${API_URL}/api/v1/auth/login`;
  const payload = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const res = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    tags: { name: 'auth_login' },
  });

  check(res, {
    'login status is 200': (r) => r.status === 200,
  });

  const body = json(res);
  const accessToken = body?.access_token;

  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error(`Login did not return access_token. status=${res.status} body=${res.body}`);
  }

  return accessToken;
}

function authHeaders(token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  // If your API expects tenant_id in query (or you can ignore it), keep it optional.
  if (TENANT_ID) headers['X-Tenant-Id'] = TENANT_ID;

  return headers;
}

export const options = {
  insecureSkipTLSVerify: (__ENV.K6_INSECURE_TLS || 'false') === 'true',
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 1),
      duration: __ENV.DURATION || '30s',
      gracefulStop: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
  },
};

export function setup() {
  const token = login();
  return { token };
}

export default function ({ token }) {
  const headers = authHeaders(token);

  const endpoints = {
    clients: `${API_URL}/api/v1/clients?limit=20&offset=0`,
    products: `${API_URL}/api/v1/products?limit=20&offset=0`,
    quotes: `${API_URL}/api/v1/quotes?limit=20&offset=0`,
  };

  const responses = http.batch([
    ['GET', endpoints.clients, null, { headers, tags: { name: 'clients_list' } }],
    ['GET', endpoints.products, null, { headers, tags: { name: 'products_list' } }],
    ['GET', endpoints.quotes, null, { headers, tags: { name: 'quotes_list' } }],
  ]);

  check(responses[0], {
    'clients 200': (r) => r.status === 200,
  });
  check(responses[1], {
    'products 200': (r) => r.status === 200,
  });
  check(responses[2], {
    'quotes 200': (r) => r.status === 200,
  });

  // Basic response shape checks (tolerant to your API envelopes)
  const clientsBody = json(responses[0]);
  const productsBody = json(responses[1]);
  const quotesBody = json(responses[2]);

  check(clientsBody, {
    'clients has list': (b) => Array.isArray(b) || Array.isArray(b?.clients) || Array.isArray(b?.data),
  });
  check(productsBody, {
    'products has list': (b) => Array.isArray(b) || Array.isArray(b?.products) || Array.isArray(b?.data),
  });
  check(quotesBody, {
    'quotes has list': (b) => Array.isArray(b) || Array.isArray(b?.quotes) || Array.isArray(b?.data),
    'quotes has no relations error': (b) => !(typeof b?.error === 'string' && b.error.includes('unsupported relations')),
  });

  sleep(Number(__ENV.SLEEP || 1));
}
