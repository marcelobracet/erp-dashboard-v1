'use client';

import { useAuth } from '@/contexts/AuthContext';
import { isAuthDisabled } from '@/lib/featureFlags';

export type UserRole = 'admin' | 'user' | string;

interface Permission {
  resource: string;
  actions: string[];
}

const rolePermissions: Record<string, Permission[]> = {
  admin: [
    { resource: 'users', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'tenants', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'clients', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'products', actions: ['read', 'create', 'update', 'delete', 'export'] },
    { resource: 'quotes', actions: ['read', 'create', 'update', 'delete', 'update_status'] },
    { resource: 'settings', actions: ['read', 'update'] },
    { resource: 'reports', actions: ['read', 'export'] },
  ],
  user: [
    { resource: 'clients', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'products', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'quotes', actions: ['read', 'create', 'update', 'delete', 'update_status'] },
    { resource: 'settings', actions: ['read'] },
  ],
};

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (resource: string, action: string): boolean => {
    if (isAuthDisabled()) return true;
    if (!user?.role) return false;
    
    const permissions = rolePermissions[user.role] || [];
    const resourcePerms = permissions.find(p => p.resource === resource);
    
    return resourcePerms?.actions.includes(action) || false;
  };

  const hasAnyPermission = (resource: string, actions: string[]): boolean => {
    return actions.some(action => hasPermission(resource, action));
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (isAuthDisabled()) return true;
    if (!user?.role && !user?.roles?.length) return false;
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    const effectiveRoles = user?.roles?.length ? user.roles : user?.role ? [user.role] : [];
    return rolesArray.some((r) => effectiveRoles.includes(r));
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
    role: isAuthDisabled() ? 'admin' : user?.role || null,
  };
}

