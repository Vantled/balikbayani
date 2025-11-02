// hooks/use-permissions.ts
import { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth';

export function usePermissions() {
  const [permissions, setPermissions] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(true);

  const checkPermission = async (permissionKey: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/permissions/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ permission_key: permissionKey })
      });

      if (!response.ok) return false;
      
      const data = await response.json();
      return data.success && data.data?.hasPermission;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  };

  const loadPermissions = async () => {
    const user = getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // For superadmin and admin, they have all permissions by default
    if (user.role === 'superadmin' || user.role === 'admin') {
      const allPermissions = {
        direct_hire: true,
        balik_manggagawa: true,
        gov_to_gov: true,
        information_sheet: true,
        monitoring: true,
        data_backups: true
      };
      setPermissions(allPermissions);
      setLoading(false);
      return;
    }

    // For staff users, check individual permissions
    const permissionKeys = [
      'direct_hire', 
      'balik_manggagawa',
      'gov_to_gov',
      'information_sheet',
      'monitoring',
      'data_backups'
    ];

    const permissionResults: {[key: string]: boolean} = {};
    
    for (const key of permissionKeys) {
      permissionResults[key] = await checkPermission(key);
    }

    setPermissions(permissionResults);
    setLoading(false);
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const hasPermission = (permissionKey: string): boolean => {
    return permissions[permissionKey] || false;
  };

  return {
    permissions,
    loading,
    hasPermission,
    checkPermission,
    reloadPermissions: loadPermissions
  };
}
