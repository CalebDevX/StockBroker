import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi, refreshAccessToken, type AuthClient } from "@/lib/api";

const ACCESS_TOKEN_KEY = "access_token"
const REFRESH_TOKEN_KEY = "refresh_token"

interface AuthContextValue {
  user: AuthClient | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; fullName: string; phone: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthClient | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    ;(async () => {
      const storedAccessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY)
      const storedRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY)

      try {
        if (storedAccessToken) {
          setToken(storedAccessToken)
          const me = await authApi.me()
          setUser(me)
          return
        }

        if (storedRefreshToken) {
          const newToken = await refreshAccessToken()
          setToken(newToken)
          const me = await authApi.me()
          setUser(me)
          return
        }
      } catch {
        await AsyncStorage.removeItem(ACCESS_TOKEN_KEY)
        await AsyncStorage.removeItem(REFRESH_TOKEN_KEY)
      } finally {
        setIsLoading(false)
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    setToken(res.accessToken);
    setUser(res.client);
  }, []);

  const register = useCallback(
    async (data: { email: string; password: string; fullName: string; phone: string }) => {
      const res = await authApi.register(data);
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
      setToken(res.accessToken);
      setUser(res.client);
    },
    []
  );

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
