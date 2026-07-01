import axios, {
  type AxiosInstance,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { emitSubscriptionRequired } from '@/lib/billing/events';
import { API_CONFIG, API_TIMEOUT } from './config';

export interface ApiError {
  message: string;
  status?: number;
}

/** Parses Gin / AbacatePay-style JSON error bodies: { error: string } or { message: string }. */
export function extractApiErrorMessage(data: unknown): string | undefined {
  if (data == null || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  if (typeof d.message === "string" && d.message.trim() !== "") {
    return d.message;
  }
  if (typeof d.error === "string" && d.error.trim() !== "") {
    return d.error;
  }
  if (d.error != null && typeof d.error === "object") {
    const nested = d.error as Record<string, unknown>;
    if (typeof nested.message === "string" && nested.message.trim() !== "") {
      return nested.message;
    }
  }
  return undefined;
}

export function isApiError(e: unknown): e is ApiError {
  return (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as ApiError).message === "string"
  );
}

class ApiClient {
  /** Exposed so auth.ts can make authenticated requests directly. */
  readonly axios: AxiosInstance;

  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(baseURL: string = API_CONFIG.baseURL) {
    this.axios = axios.create({
      baseURL,
      timeout: API_TIMEOUT,
      headers: { 'Content-Type': 'application/json' },
    });

    // ── Request interceptor: attach Bearer token ──────────────────────
    this.axios.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // ── Response interceptor: handle 401 with silent token refresh ────
    this.axios.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const original = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        const isAuthRoute =
          original?.url?.includes('/auth/login') ||
          original?.url?.includes('/auth/refresh');

        if (
          error.response?.status === 401 &&
          !original?._retry &&
          !isAuthRoute &&
          this.getToken()
        ) {
          if (this.isRefreshing) {
            // Queue request until refresh completes
            return new Promise((resolve, reject) => {
              this.refreshSubscribers.push((newToken) => {
                original.headers.Authorization = `Bearer ${newToken}`;
                resolve(this.axios(original));
              });
              void reject; // suppress unused warning
            });
          }

          original._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.performRefresh();
            this.refreshSubscribers.forEach((cb) => cb(newToken));
            original.headers.Authorization = `Bearer ${newToken}`;
            return this.axios(original);
          } catch {
            this.removeToken();
            return Promise.reject(this.normalizeError(error));
          } finally {
            this.refreshSubscribers = [];
            this.isRefreshing = false;
          }
        }

        if (error.response?.status === 403) {
          this.handleSubscriptionRequired(error);
        }

        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  /** Opens SubscriptionGate when the API blocks access (trial ended / inactive plan). */
  private handleSubscriptionRequired(error: AxiosError): void {
    const data = error.response?.data;
    if (data == null || typeof data !== 'object') return;
    const body = data as Record<string, unknown>;
    const code = body.code ?? body.error;
    if (code !== 'subscription_required') return;
    const trialEndsAt =
      typeof body.trial_ends_at === 'string' ? body.trial_ends_at : null;
    emitSubscriptionRequired({ trialEndsAt });
  }

  private async performRefresh(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    // Raw axios call — bypasses this instance's interceptors
    const { data } = await axios.post<{
      access_token: string;
      refresh_token?: string;
    }>(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.auth.refresh}`, {
      refresh_token: refreshToken,
    });

    if (data.access_token) this.setToken(data.access_token);
    if (data.refresh_token) this.setRefreshToken(data.refresh_token);

    return data.access_token;
  }

  private normalizeError(error: AxiosError): ApiError {
    const data = error.response?.data;
    let message =
      extractApiErrorMessage(data) ??
      error.message ??
      'Ocorreu um erro';
    if (
      data != null &&
      typeof data === 'object' &&
      (data as Record<string, unknown>).code === 'subscription_required' &&
      typeof (data as Record<string, unknown>).message === 'string'
    ) {
      message = (data as Record<string, unknown>).message as string;
    }
    return { message, status: error.response?.status };
  }

  // ── Convenience wrappers ─────────────────────────────────────────────

  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const { data } = await this.axios.get<T>(endpoint, config);
    return data;
  }

  async post<T>(endpoint: string, payload?: unknown): Promise<T> {
    const { data } = await this.axios.post<T>(endpoint, payload);
    return data;
  }

  async put<T>(endpoint: string, payload?: unknown): Promise<T> {
    const { data } = await this.axios.put<T>(endpoint, payload);
    return data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const { data } = await this.axios.delete<T>(endpoint);
    return data;
  }

  // ── Token helpers ─────────────────────────────────────────────────────

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', token);
  }

  removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('refresh_token', token);
  }
}

export const apiClient = new ApiClient();

