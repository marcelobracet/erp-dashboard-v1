import { API_CONFIG, API_TIMEOUT } from './config';

export interface ApiError {
  message: string;
  status?: number;
}

export class ApiClient {
  private baseURL: string;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  constructor(baseURL: string = API_CONFIG.baseURL) {
    this.baseURL = baseURL;
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}${API_CONFIG.endpoints.auth.refresh}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      this.removeToken();
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    if (data.access_token) {
      this.setToken(data.access_token);
    }
    if (data.refresh_token) {
      this.setRefreshToken(data.refresh_token);
    }

    return data.access_token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retry = true
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 401 Unauthorized - try to refresh token (but only if we have a token)
      if (response.status === 401 && retry && endpoint !== API_CONFIG.endpoints.auth.refresh && endpoint !== API_CONFIG.endpoints.auth.login) {
        // Only try refresh if we have a token (meaning this is a session expiry, not invalid credentials)
        if (token) {
          let originalError: ApiError | null = null;
          
          // Try to get original error message before refresh
          try {
            const errorData = await response.clone().json().catch(() => null);
            if (errorData) {
              originalError = {
                message: errorData.message || errorData.error || 'Session expired',
                status: response.status,
              };
            }
          } catch (e) {
            // Ignore parsing errors
          }

          try {
            await this.refreshAccessToken();
            // Retry the request with new token
            return this.request<T>(endpoint, options, false);
          } catch (refreshError) {
            this.removeToken();
            // Use original error message if available, otherwise default message
            throw originalError || { message: 'Session expired. Please login again.', status: 401 } as ApiError;
          }
        }
      }

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: response.statusText || 'An error occurred' };
        }

        const error: ApiError = {
          message: errorData.message || errorData.error || 'An error occurred',
          status: response.status,
        };

        throw error;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw { message: 'Request timeout', status: 408 } as ApiError;
        }
        throw { message: error.message } as ApiError;
      }

      throw error;
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Method to make requests without token refresh (for auth endpoints)
  async postWithoutRefresh<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, false); // Pass false to prevent retry
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  private getToken(): string | null {
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

