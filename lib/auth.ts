import Cookies from 'js-cookie'

export type User = {
  username: string
}

const AUTH_COOKIE = 'bb_auth_token'
const USER_COOKIE = 'bb_user'

export const login = async (username: string, password: string): Promise<boolean> => {
  // Simulate authentication (replace with real API call)
  if (username === 'admin' && password === 'password') {
    Cookies.set(AUTH_COOKIE, 'sample_token', { expires: 1 })
    Cookies.set(USER_COOKIE, JSON.stringify({ username }), { expires: 1 })
    return true
  }
  return false
}

export const logout = () => {
  Cookies.remove(AUTH_COOKIE)
  Cookies.remove(USER_COOKIE)
}

export const isAuthenticated = (): boolean => {
  return Boolean(Cookies.get(AUTH_COOKIE))
}

export const getUser = (): User | null => {
  const user = Cookies.get(USER_COOKIE)
  if (!user) return null
  try {
    return JSON.parse(user)
  } catch {
    return null
  }
} 