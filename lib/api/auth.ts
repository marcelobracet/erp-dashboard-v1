import { apiClient, ApiError } from "./client";
import { API_CONFIG } from "./config";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role?: string;
  };
}

export interface RefreshTokenRequest {
  refresh_token: string;
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
}

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Use direct fetch for login to avoid token refresh logic
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}${
        API_CONFIG.endpoints.auth.login
      }`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      }
    );

    if (!response.ok) {
      let errorData: { message?: string; error?: string } = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText || "Invalid credentials" };
      }

      const error: ApiError = {
        message: errorData.message || errorData.error || "Invalid credentials",
        status: response.status,
      };

      if (error?.status === 401) {
        error.message = "Credenciais inválidas";
      }

      throw error;
    }

    const data = await response.json();

    if (data.access_token) {
      apiClient.setToken(data.access_token);
    }

    if (data.refresh_token) {
      apiClient.setRefreshToken(data.refresh_token);
    }

    return data;
  },

  async register(payload: RegisterRequest): Promise<RegisterResponse> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}${
        API_CONFIG.endpoints.users.register
      }`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      let errorData: { message?: string; error?: string } = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText || "Failed to register" };
      }

      const error: ApiError = {
        message: errorData.message || errorData.error || "Failed to register",
        status: response.status,
      };

      if (error?.status === 409) {
        error.message = "Este email já está em uso";
      }

      throw error;
    }

    const data = await response.json();

    if (data.access_token) {
      apiClient.setToken(data.access_token);
    }

    if (data.refresh_token) {
      apiClient.setRefreshToken(data.refresh_token);
    }

    return data;
  },

  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = apiClient.getRefreshToken();

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await apiClient.post<RefreshTokenResponse>(
      API_CONFIG.endpoints.auth.refresh,
      { refresh_token: refreshToken }
    );

    if (response.access_token) {
      apiClient.setToken(response.access_token);
    }

    if (response.refresh_token) {
      apiClient.setRefreshToken(response.refresh_token);
    }

    return response;
  },

  async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>(API_CONFIG.endpoints.users.profile);
  },

  logout(): void {
    apiClient.removeToken();
  },

  isAuthenticated(): boolean {
    return (
      typeof window !== "undefined" && !!localStorage.getItem("access_token")
    );
  },
};
