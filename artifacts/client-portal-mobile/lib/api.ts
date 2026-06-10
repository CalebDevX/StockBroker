import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

const ACCESS_TOKEN_KEY = "access_token"
const REFRESH_TOKEN_KEY = "refresh_token"

async function getAccessToken() { return AsyncStorage.getItem(ACCESS_TOKEN_KEY) }
async function getRefreshToken() { return AsyncStorage.getItem(REFRESH_TOKEN_KEY) }
async function setAccessToken(token: string) { await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token) }
async function setRefreshToken(token: string) { await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token) }
async function clearAuthTokens() {
  await AsyncStorage.removeItem(ACCESS_TOKEN_KEY)
  await AsyncStorage.removeItem(REFRESH_TOKEN_KEY)
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) throw new Error("Session refresh token not found")

  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) {
    await clearAuthTokens()
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? "Session expired")
  }

  const data = await res.json() as { accessToken: string }
  await setAccessToken(data.accessToken)
  return data.accessToken
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (res.ok) {
    return res.json() as Promise<T>;
  }

  if (res.status === 401 && path !== "/api/auth/refresh") {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      try {
        const newToken = await refreshAccessToken();
        headers["Authorization"] = `Bearer ${newToken}`;
        const retryRes = await fetch(`${BASE_URL}${path}`, { ...options, headers });
        if (retryRes.ok) return retryRes.json() as Promise<T>;
        const retryBody = await retryRes.json().catch(() => ({}));
        throw new Error((retryBody as { error?: string }).error ?? `HTTP ${retryRes.status}`);
      } catch (refreshError) {
        throw refreshError
      }
    }
  }

  const body = await res.json().catch(() => ({}));
  throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
}

// ── Auth ────────────────────────────────────────────────────────────────────

export interface AuthClient {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: string;
  kycStatus: string;
  kycTier: string;
  cashBalanceKobo: number;
  bvn?: string | null;
  nin?: string | null;
  chn?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  client: AuthClient;
}

export interface KycPayload {
  fullName: string;
  phone: string;
  dob: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  sourceOfFunds: string;
  bvn: string;
  nin: string;
  chn?: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
  }) =>
    apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: () => apiFetch<AuthClient>("/api/auth/me"),
  refresh: () => refreshAccessToken(),
  submitKyc: (payload: KycPayload) =>
    apiFetch<{ client: AuthClient; message: string }>("/api/auth/kyc", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};

// ── Portfolio ────────────────────────────────────────────────────────────────

export interface PortfolioSummary {
  cashBalanceKobo: number;
  totalMarketValueKobo: number;
  totalUnrealisedPnlKobo: number;
  totalCostBasisKobo: number;
  holdingsCount: number;
  pnlPercent: number;
}

export interface Holding {
  symbol: string;
  quantity: number;
  avgCostKobo: number;
  currentPriceKobo: number;
  marketValueKobo: number;
  unrealisedPnlKobo: number;
  pnlPercent: number;
}

export interface Transaction {
  id: string;
  type: string;
  amountKobo: number;
  balanceAfterKobo: number;
  reference: string;
  description: string;
  createdAt: string;
}

export const portfolioApi = {
  summary: () => apiFetch<{ summary: PortfolioSummary }>("/api/portfolio/summary"),
  holdings: () => apiFetch<{ holdings: Holding[] }>("/api/portfolio/holdings"),
  transactions: (limit = 20) =>
    apiFetch<{ transactions: Transaction[] }>(`/api/portfolio/transactions?limit=${limit}`),
};

// ── Orders ──────────────────────────────────────────────────────────────────

export interface Order {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  quantity: number;
  filledQuantity: number;
  limitPriceKobo: number | null;
  avgFillPriceKobo: number | null;
  status: string;
  totalCostKobo: number | null;
  brokerageFeeKobo: number | null;
  vatKobo: number | null;
  grossConsiderationKobo: number | null;
  createdAt: string;
  rejectReason: string | null;
}

export interface PlaceOrderPayload {
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  quantity: number;
  limitPriceKobo?: number;
  validity?: "day" | "gtc" | "ioc" | "fok";
}

export const ordersApi = {
  list: () => apiFetch<{ orders: Order[] }>("/api/orders"),
  place: (payload: PlaceOrderPayload) =>
    apiFetch<{ order: Order }>("/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  cancel: (id: string) =>
    apiFetch<{ order: Order }>(`/api/orders/${id}/cancel`, { method: "POST" }),
  quote: (symbol: string, side: string, quantity: number, limitPriceKobo?: number) =>
    apiFetch<{ quote: { grossKobo: number; feesKobo: number; totalKobo: number; breakdown: Record<string, number> } }>(
      "/api/orders/quote",
      { method: "POST", body: JSON.stringify({ symbol, side, quantity, limitPriceKobo }) }
    ),
};

// ── Market ──────────────────────────────────────────────────────────────────

export interface Instrument {
  symbol: string;
  name: string;
  sector: string;
  lastPriceNaira: string;
  prevClosePriceNaira: string;
  isActive: boolean;
  isTradingSuspended: boolean;
}

export interface Mover {
  symbol: string;
  name: string;
  lastPriceKobo: number;
  prevClosePriceKobo: number;
  changeKobo: number;
  changePct: number;
}

export const marketApi = {
  search: (q: string) =>
    apiFetch<{ instruments: Instrument[] }>(`/api/market/search?q=${encodeURIComponent(q)}`),
  movers: () =>
    apiFetch<{ gainers: Mover[]; losers: Mover[] }>("/api/market/movers"),
  quote: (symbol: string) =>
    apiFetch<{ instrument: Instrument }>(`/api/market/quote/${symbol}`),
};

// ── Funds ────────────────────────────────────────────────────────────────────

export const fundsApi = {
  balance: () => apiFetch<{ cashBalanceKobo: number }>("/api/funds/balance"),
  deposit: (amountKobo: number, bankReference?: string) =>
    apiFetch<{ transaction: Transaction; cashBalanceKobo: number }>("/api/funds/deposit", {
      method: "POST",
      body: JSON.stringify({ amountKobo, bankReference }),
    }),
  withdraw: (amountKobo: number) =>
    apiFetch<{ transaction: Transaction; cashBalanceKobo: number }>("/api/funds/withdraw", {
      method: "POST",
      body: JSON.stringify({ amountKobo }),
    }),
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export const toNaira = (kobo: number): string => {
  const naira = kobo / 100;
  if (Math.abs(naira) >= 1_000_000)
    return `₦${(naira / 1_000_000).toFixed(2)}M`;
  if (Math.abs(naira) >= 1_000)
    return `₦${(naira / 1_000).toFixed(1)}k`;
  return `₦${naira.toFixed(2)}`;
};

export const fmtNaira = (kobo: number): string =>
  `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
