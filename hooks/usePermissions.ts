'use client';

import { useAuth } from '@/contexts/AuthContext';
import { isAuthDisabled } from '@/lib/featureFlags';
import type { Permission } from '@/lib/auth/permissions';

export type UserRole = 'admin' | 'user' | string;
export type { Permission };

export function usePermissions() {
  const { user, rolePermissions } = useAuth();

  const effectiveRoles = (): string[] => {
    if (isAuthDisabled()) return ['admin'];
    return user?.roles?.length ? user.roles : user?.role ? [user.role] : [];
  };

  /**
   * Verifica se o usuário tem permissão para a action em um resource.
   * Aceita QUALQUER das suas roles — ex: usuário com ['admin', 'user'] recebe permissões das duas.
   */
  const hasPermission = (resource: string, action: string): boolean => {
    if (isAuthDisabled()) return true;
    return effectiveRoles().some((role) => {
      const permissions: Permission[] = rolePermissions?.[role] ?? [];
      return permissions.some((p) => p.resource === resource && p.actions.includes(action));
    });
  };

  const hasAnyPermission = (resource: string, actions: string[]): boolean => {
    return actions.some((action) => hasPermission(resource, action));
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (isAuthDisabled()) return true;
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    return rolesArray.some((r) => effectiveRoles().includes(r));
  };

  const canAccess = (resource: string): boolean => {
    if (isAuthDisabled()) return true;
    return hasAnyPermission(resource, ['read', 'create', 'update', 'delete']);
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasRole,
    canAccess,
    /** Role principal do usuário (primeira da lista resolvida). */
    role: isAuthDisabled() ? 'admin' : effectiveRoles()[0] ?? null,
    /** Todas as roles do usuário após resolução. */
    roles: isAuthDisabled() ? ['admin'] : effectiveRoles(),
  };
}

