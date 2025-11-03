'use client';

import { useAuth } from '@/contexts/AuthContext';

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
    if (!user?.role) return false;
    
    const permissions = rolePermissions[user.role] || [];
    const resourcePerms = permissions.find(p => p.resource === resource);
    
    return resourcePerms?.actions.includes(action) || false;
  };

  const hasAnyPermission = (resource: string, actions: string[]): boolean => {
    return actions.some(action => hasPermission(resource, action));
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user?.role) return false;
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    return rolesArray.includes(user.role);
  };

  const canAccess = (resource: string): boolean => {
    return hasAnyPermission(resource, ['read', 'create', 'update', 'delete']);
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasRole,
    canAccess,
    role: user?.role || null,
  };
}

