'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { UserProfile } from '@/lib/api/auth';
import { authService } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';
import { isAuthDisabled } from '@/lib/featureFlags';
import { apiClient } from '@/lib/api/client';
import {
  type RolePermissionsMap,
  DEFAULT_ROLE_PERMISSIONS,
  fetchPermissionsFromApi,
} from '@/lib/auth/permissions';
import { setTenantIdSync } from '@/lib/auth/tenant';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  rolePermissions: RolePermissionsMap;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_DISABLED_USER: UserProfile = {
  id: 'auth-disabled',
  email: 'auth-disabled@local',
  name: 'Admin (auth desativada)',
  role: 'admin',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionsMap>(DEFAULT_ROLE_PERMISSIONS);

  // Restore session on mount: if a token exists in localStorage, fetch the profile.
  useEffect(() => {
    if (isAuthDisabled()) {
      setUser(AUTH_DISABLED_USER);
      setIsLoading(false);
      return;
    }

    const token =
      typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    if (!token) {
      setIsLoading(false);
      return;
    }

    authService
      .getProfile()
      .then((profile) => {
        if (profile.tenant_id?.trim()) {
          setTenantIdSync(profile.tenant_id);
        }
        setUser(profile);
      })
      .catch(() => {
        // Token expired or invalid — clear storage silently.
        apiClient.removeToken();
        setTenantIdSync(null);
      })
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload role permissions whenever the user changes.
  useEffect(() => {
    if (isAuthDisabled() || !user) return;
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) return;
    fetchPermissionsFromApi(token).then((perms) => {
      if (perms) setRolePermissions(perms);
    });
  }, [user]);

  const login = async (email: string, password: string) => {
    if (isAuthDisabled()) {
      router.push('/dashboard');
      return;
    }

    // authService.login stores the token in localStorage automatically.
    const data = await authService.login({ email, password });

    const profile: UserProfile = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role,
      tenant_id: data.user.tenant_id,
    };

    if (data.user.tenant_id?.trim()) {
      setTenantIdSync(data.user.tenant_id);
    }
    setUser(profile);
    router.push('/dashboard');
  };

  const logout = useCallback(async () => {
    if (isAuthDisabled()) {
      router.push('/auth/login');
      return;
    }
    authService.logout(); // clears localStorage tokens
    setTenantIdSync(null);
    setUser(null);
    router.push('/auth/login');
  }, [router]);

  const refreshUser = async () => {
    if (isAuthDisabled()) return;
    try {
      const profile = await authService.getProfile();
      if (profile.tenant_id?.trim()) {
        setTenantIdSync(profile.tenant_id);
      }
      setUser(profile);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: isAuthDisabled() ? AUTH_DISABLED_USER : user,
        isLoading,
        isAuthenticated: isAuthDisabled() || user !== null,
        rolePermissions,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

