import axios from 'axios';
import { apiClient, type ApiError } from './client';
import { API_CONFIG } from './config';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    tenant_id: string;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'employee';
  };
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'manager' | 'employee';
}

/** Shape returned by POST /api/v1/auth/register (Go: c.JSON(201, userInfo)) */
export interface RegisterResponse {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id?: string;
  roles?: string[];
}

export const authService = {
  /**
   * POST /api/v1/auth/login
   * Uses a plain axios instance (no auth token, no interceptors).
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const { data } = await axios.post<LoginResponse>(
        `${API_CONFIG.baseURL}${API_CONFIG.endpoints.auth.login}`,
        credentials,
        { headers: { 'Content-Type': 'application/json' } }
      );

      apiClient.setToken(data.access_token);
      apiClient.setRefreshToken(data.refresh_token);

      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const body = err.response?.data as { message?: string; error?: string } | undefined;
        const status = err.response?.status;
        const message =
          status === 401
            ? 'Credenciais inválidas'
            : body?.message ?? body?.error ?? 'Erro ao fazer login';
        throw { message, status } as ApiError;
      }
      throw { message: 'Erro ao conectar ao servidor' } as ApiError;
    }
  },

  /**
   * POST /api/v1/auth/register   (requires admin Bearer token)
   * Uses apiClient.axios → the request interceptor automatically attaches
   * the logged-in admin's token from localStorage.
   */
  async register(payload: RegisterRequest): Promise<RegisterResponse> {
    try {
      return await apiClient.post<RegisterResponse>(
        API_CONFIG.endpoints.users.register,
        payload,
      );
    } catch (err) {
      // The response interceptor already normalises AxiosError → ApiError.
      // We just enrich the message for known status codes.
      const e = err as ApiError;
      if (e.status === 401) e.message = 'Sem permissão. Faça login como administrador.';
      if (e.status === 403) e.message = 'Acesso negado. Apenas administradores podem criar usuários.';
      if (e.status === 409) e.message = 'Este e-mail já está em uso.';
      throw e;
    }
  },

  /**
   * GET /api/v1/users/profile
   * Uses apiClient → Bearer token attached automatically.
   */
  async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>(API_CONFIG.endpoints.users.profile);
  },

  /** Clears stored tokens. */
  logout(): void {
    apiClient.removeToken();
  },

  isAuthenticated(): boolean {
    return typeof window !== 'undefined' && !!localStorage.getItem('access_token');
  },
};
