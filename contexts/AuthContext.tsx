'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService, UserProfile } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';
import { isAuthDisabled } from '@/lib/featureFlags';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Mark as mounted to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshUser = useCallback(async () => {
    if (isAuthDisabled()) {
      setUser((prev) => prev ?? AUTH_DISABLED_USER);
      setIsLoading(false);
      return;
    }

    // Only fetch user if we're on the client side and authenticated
    if (typeof window === 'undefined' || !authService.isAuthenticated()) {
      setIsLoading(false);
      return;
    }

    try {
      const profile = await authService.getProfile();
      setUser(profile);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only refresh user after component is mounted
    if (mounted) {
      refreshUser();
    }
  }, [mounted, refreshUser]);

  const login = async (email: string, password: string) => {
    try {
      if (isAuthDisabled()) {
        setUser((prev) => prev ?? AUTH_DISABLED_USER);
        router.push('/dashboard');
        return;
      }

      const response = await authService.login({ email, password });
      
      if (response.user) {
        setUser(response.user);
      } else {
        await refreshUser();
      }

      router.push('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      if (isAuthDisabled()) {
        setUser((prev) => prev ?? AUTH_DISABLED_USER);
        router.push('/dashboard');
        return;
      }

      const response = await authService.register({ name, email, password });

      if (response.access_token) {
        if (response.user) {
          setUser(response.user as UserProfile);
        } else {
          await refreshUser();
        }

        router.push('/dashboard');
        return;
      }

      await login(email, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    router.push('/auth/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: isAuthDisabled() || !!user,
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

