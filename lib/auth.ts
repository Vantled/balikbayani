import Cookies from 'js-cookie'

export type User = {
  id: string
  username: string
  email: string
  full_name: string
  role: 'superadmin' | 'admin' | 'staff'
  is_approved: boolean
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
  is_first_login?: boolean
}

const AUTH_COOKIE = 'bb_auth_token'
const USER_COOKIE = 'bb_user'

export const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (data.success) {
      // Server sets HttpOnly token cookie; store user for UI only
      Cookies.set(USER_COOKIE, JSON.stringify(data.data.user), { expires: 1 });
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Network error' };
  }
}

export const logout = async (): Promise<void> => {
  const token = Cookies.get(AUTH_COOKIE);
  
  // Remove readable user cookie immediately; server clears HttpOnly token
  Cookies.remove(USER_COOKIE);
  
  // Call logout API in the background (don't wait for it)
  if (token) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    }).catch((error) => {
      console.error('Logout API error (background):', error);
    });
  }
}

export const isAuthenticated = (): boolean => {
  const token = Cookies.get(AUTH_COOKIE);
  const user = Cookies.get(USER_COOKIE);
  // Both cookies must exist for authentication to be valid
  return Boolean(token && user);
}

export const register = async (userData: {
  username: string;
  email: string;
  password: string;
  full_name: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Network error' };
  }
};

export const getUser = (): User | null => {
  const user = Cookies.get(USER_COOKIE);
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
};

// Role-based authorization functions
export const hasRole = (user: User | null, requiredRole: 'superadmin' | 'admin' | 'staff'): boolean => {
  if (!user) return false;
  
  const roleHierarchy = {
    'superadmin': 3,
    'admin': 2,
    'staff': 1
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
};

export const isSuperadmin = (user: User | null): boolean => hasRole(user, 'superadmin');
export const isAdmin = (user: User | null): boolean => hasRole(user, 'admin');
export const isStaff = (user: User | null): boolean => hasRole(user, 'staff');

export const canManageUsers = (user: User | null): boolean => isSuperadmin(user);
export const canAccessAdminFeatures = (user: User | null): boolean => hasRole(user, 'admin');
export const canManagePermissions = (user: User | null): boolean => hasRole(user, 'admin');

// Permission checking functions
export const checkPermission = async (permissionKey: string): Promise<boolean> => {
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

// Available permission keys
export const PERMISSIONS = {
  DIRECT_HIRE: 'direct_hire',
  BALIK_MANGGAGAWA: 'balik_manggagawa',
  GOV_TO_GOV: 'gov_to_gov',
  INFORMATION_SHEET: 'information_sheet',
  MONITORING: 'monitoring',
  DATA_BACKUPS: 'data_backups'
} as const;

export const validateSession = async (): Promise<boolean> => {
  const token = Cookies.get(AUTH_COOKIE);
  // If token not readable (HttpOnly), allow server to validate from cookie

  try {
    const response = await fetch('/api/auth/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(token ? { token } : {}),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}; 