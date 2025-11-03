'use client';

import React, { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { UserRole } from '@/hooks/usePermissions';

interface ProtectedComponentProps {
  children: ReactNode;
  resource?: string;
  action?: string;
  roles?: UserRole | UserRole[];
  fallback?: ReactNode;
}

export function ProtectedComponent({ 
  children, 
  resource, 
  action, 
  roles,
  fallback = null 
}: ProtectedComponentProps) {
  const { hasPermission, hasRole } = usePermissions();

  if (roles && !hasRole(roles)) {
    return <>{fallback}</>;
  }

  if (resource && action && !hasPermission(resource, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

