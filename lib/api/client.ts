import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { API_CONFIG, API_TIMEOUT } from './config';

export interface ApiError {
  message: string;
  status?: number;
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

        return Promise.reject(this.normalizeError(error));
      }
    );
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
    const data = error.response?.data as
      | Record<string, unknown>
      | undefined;
    const message =
      (data?.message as string | undefined) ??
      (data?.error as string | undefined) ??
      error.message ??
      'Ocorreu um erro';
    return { message, status: error.response?.status };
  }

  // ── Convenience wrappers ─────────────────────────────────────────────

  async get<T>(endpoint: string): Promise<T> {
    const { data } = await this.axios.get<T>(endpoint);
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

