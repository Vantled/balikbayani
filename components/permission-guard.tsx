// components/permission-guard.tsx
'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export default function PermissionGuard({ 
  permission, 
  children, 
  fallback = null,
  redirectTo = '/dashboard'
}: PermissionGuardProps) {
  const { hasPermission, loading } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !hasPermission(permission)) {
      if (redirectTo) {
        router.push(redirectTo);
      }
    }
  }, [loading, hasPermission, permission, redirectTo, router]);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
