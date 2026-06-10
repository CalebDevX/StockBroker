import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi, refreshAccessToken, type AuthClient } from '@/lib/api'

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

interface AuthContextValue {
  user: AuthClient | null
  token: string | null
  isLoading: boolean
  login:             (email: string, password: string) => Promise<void>
  register:          (data: { email: string; password: string; fullName: string; phone: string }) => Promise<void>
  loginWithTokens:   (accessToken: string, refreshToken: string, client: AuthClient) => void
  logout:            () => void
  refreshUser:       () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<AuthClient | null>(null)
  const [token,     setToken]     = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedAccessToken  = localStorage.getItem(ACCESS_TOKEN_KEY)
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

    async function restoreSession() {
      if (storedAccessToken) {
        setToken(storedAccessToken)
        try {
          const client = await authApi.me()
          setUser(client)
          return
        } catch {
          if (storedRefreshToken) {
            const newToken = await refreshAccessToken()
            setToken(newToken)
            const client = await authApi.me()
            setUser(client)
            return
          }
          localStorage.removeItem(ACCESS_TOKEN_KEY)
          localStorage.removeItem(REFRESH_TOKEN_KEY)
        }
      } else if (storedRefreshToken) {
        try {
          const newToken = await refreshAccessToken()
          setToken(newToken)
          const client = await authApi.me()
          setUser(client)
          return
        } catch {
          localStorage.removeItem(ACCESS_TOKEN_KEY)
          localStorage.removeItem(REFRESH_TOKEN_KEY)
        }
      }
    }

    restoreSession().finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken)
    setToken(res.accessToken)
    setUser(res.client)
  }, [])

  const register = useCallback(async (
    data: { email: string; password: string; fullName: string; phone: string }
  ) => {
    const res = await authApi.register(data)
    localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken)
    setToken(res.accessToken)
    setUser(res.client)
  }, [])

  const loginWithTokens = useCallback((accessToken: string, refreshToken: string, client: AuthClient) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    setToken(accessToken)
    setUser(client)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const updated = await authApi.me()
      setUser(updated)
    } catch {}
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, loginWithTokens, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
