'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { UserProfile } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';
import { isAuthDisabled } from '@/lib/featureFlags';
import { signIn, signOut, useSession } from 'next-auth/react';
import { setTenantIdSync } from '@/lib/auth/tenant';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  register: () => Promise<void>;
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
  const { data: session, status } = useSession();

  const isLoading = !isAuthDisabled() && status === 'loading';

  const user = useMemo<UserProfile | null>(() => {
    if (isAuthDisabled()) return AUTH_DISABLED_USER;
    if (status !== 'authenticated') return null;

    const roles = session?.roles ?? [];
    const role = roles.includes('admin') ? 'admin' : roles.includes('user') ? 'user' : roles[0] ?? 'user';

    return {
      id: session?.user?.id ?? session?.user?.email ?? 'user',
      email: session?.user?.email ?? '',
      name: session?.user?.name ?? session?.user?.email ?? 'Usuário',
      role,
      tenant_id: session?.tenant_id,
      roles,
    };
  }, [session, status]);

  useEffect(() => {
    if (isAuthDisabled()) {
      setTenantIdSync('auth-disabled');
      return;
    }
    setTenantIdSync(session?.tenant_id ?? null);
  }, [session?.tenant_id]);

  const refreshUser = async () => {
    // With NextAuth, session is the source of truth.
    return;
  };

  const login = async () => {
    if (isAuthDisabled()) {
      router.push('/dashboard');
      return;
    }
    const result = await signIn('keycloak', {
      callbackUrl: `${window.location.origin}/dashboard`,
      redirect: false,
    });

    if (!result) throw new Error('OAuthSignin');
    if (result.error) throw new Error(result.error);
    if (result.url) window.location.href = result.url;
  };

  const register = async () => {
    if (isAuthDisabled()) {
      router.push('/dashboard');
      return;
    }
    // Keycloak handles registration on its own UI (if enabled).
    const result = await signIn('keycloak', {
      callbackUrl: `${window.location.origin}/dashboard`,
      redirect: false,
    });

    if (!result) throw new Error('OAuthSignin');
    if (result.error) throw new Error(result.error);
    if (result.url) window.location.href = result.url;
  };

  const logout = async () => {
    if (isAuthDisabled()) {
      router.push('/auth/login');
      return;
    }
    await signOut({ callbackUrl: `${window.location.origin}/auth/login` });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: isAuthDisabled() || status === 'authenticated',
        login,
        register,
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

