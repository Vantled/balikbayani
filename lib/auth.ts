import Cookies from 'js-cookie'

export type User = {
  id: string
  username: string
  email: string
  full_name: string
  role: 'admin' | 'staff' | 'user'
  is_approved: boolean
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
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
      // Store token and user data
      Cookies.set(AUTH_COOKIE, data.data.token, { expires: 1 });
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
  
  // Remove cookies immediately for fast logout
  Cookies.remove(AUTH_COOKIE);
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

export const validateSession = async (): Promise<boolean> => {
  const token = Cookies.get(AUTH_COOKIE);
  if (!token) return false;

  try {
    const response = await fetch('/api/auth/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}; 