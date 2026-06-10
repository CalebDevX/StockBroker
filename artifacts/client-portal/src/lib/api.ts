const API_URL = import.meta.env.VITE_API_URL as string | undefined
const BASE = API_URL ? API_URL.replace(/\/$/, '') : '/api'
const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

function getAccessToken() { return localStorage.getItem(ACCESS_TOKEN_KEY) }
function getRefreshToken() { return localStorage.getItem(REFRESH_TOKEN_KEY) }
function setAccessToken(token: string) { localStorage.setItem(ACCESS_TOKEN_KEY, token) }
function setRefreshToken(token: string) { localStorage.setItem(REFRESH_TOKEN_KEY, token) }
function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('Session refresh token not found')

  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) {
    clearAuthTokens()
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? 'Session expired')
  }

  const data = await res.json() as { accessToken: string }
  setAccessToken(data.accessToken)
  return data.accessToken
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (res.ok) {
    return res.json() as Promise<T>
  }

  if (res.status === 401 && path !== '/auth/refresh') {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      try {
        const newToken = await refreshAccessToken()
        headers['Authorization'] = `Bearer ${newToken}`
        const retryRes = await fetch(`${BASE}${path}`, { ...options, headers })
        if (retryRes.ok) return retryRes.json() as Promise<T>
        const retryBody = await retryRes.json().catch(() => ({}))
        throw new Error((retryBody as { error?: string }).error ?? `HTTP ${retryRes.status}`)
      } catch (refreshError) {
        throw refreshError
      }
    }
  }

  const body = await res.json().catch(() => ({}))
  throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
}

// ─── Auth ─────────────────────────────────────────────────────────────
export interface AuthClient {
  id: string; email: string; fullName: string; phone: string
  role: string; kycStatus: string; kycTier: string; cashBalanceKobo: number
  bvn: string | null; nin: string | null; chn: string | null
}
export interface AuthResponse { accessToken: string; refreshToken: string; client: AuthClient }

export interface KycPayload {
  dob: string
  gender: 'male' | 'female' | 'other'
  bvn: string
  nin: string
  address: { street: string; city: string; state: string; lga: string; postalCode: string }
}

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data: { email: string; password: string; fullName: string; phone: string }) =>
    apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => apiFetch<AuthClient>('/auth/me'),
  refresh: () => refreshAccessToken(),
  submitKyc: (payload: KycPayload) =>
    apiFetch<{ client: AuthClient; message: string }>('/auth/kyc', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  forgotPassword: (email: string) =>
    apiFetch<{ sent: boolean; devToken?: string }>('/auth/forgot-password', {
      method: 'POST', body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, newPassword: string) =>
    apiFetch<{ reset: boolean }>('/auth/reset-password', {
      method: 'POST', body: JSON.stringify({ token, newPassword }),
    }),
}

// ─── Portfolio ────────────────────────────────────────────────────────
export interface PortfolioSummary {
  clientName: string
  cashBalanceKobo: number
  cashBalanceNaira: number
  totalEquityValueKobo: number
  totalPortfolioKobo: number
  totalPortfolioNaira: number
  unrealisedPnlKobo: number
  unrealisedPnlNaira: number
  pnlPercent: number
  holdingsCount: number
}

export interface Holding {
  symbol: string
  quantity: number
  reservedQuantity: number
  avgCostKobo: number
  currentPriceKobo: number
  marketValueKobo: number
  unrealisedPnlKobo: number
  instrumentName: string | null
  sector: string | null
  pnlPercent: number
  availableQty: number
}

export interface Transaction {
  id: string
  type: string
  amountKobo: number
  balanceAfterKobo: number
  reference: string
  description: string
  bankReference?: string | null
  bankName?: string | null
  createdAt: string
}

export interface ChartPoint { date: string; valueKobo: number }
export interface SectorSlice { name: string; valueKobo: number; percentage: number }

export const portfolioApi = {
  summary: () => apiFetch<PortfolioSummary>('/portfolio'),
  holdings: () => apiFetch<{ holdings: Holding[] }>('/portfolio/holdings'),
  transactions: (limit = 20) =>
    apiFetch<{ transactions: Transaction[] }>(`/portfolio/transactions?limit=${limit}`),
  chart: () =>
    apiFetch<{ points: ChartPoint[]; hasData: boolean }>('/portfolio/chart'),
  sectorAllocation: () =>
    apiFetch<{ sectors: SectorSlice[]; totalEquityKobo: number; hasPositions: boolean }>(
      '/portfolio/sector-allocation',
    ),
}

// ─── Orders ───────────────────────────────────────────────────────────
export interface Order {
  id: string
  clOrdId: string
  symbol: string
  side: 'buy' | 'sell'
  orderType: 'market' | 'limit'
  quantity: number
  filledQuantity: number
  limitPriceKobo: number | null
  avgFillPriceKobo: number | null
  status: string
  totalCostKobo: number | null
  brokerageFeeKobo: number | null
  vatKobo: number | null
  grossConsiderationKobo: number | null
  createdAt: string
  rejectReason: string | null
}

export interface PlaceOrderPayload {
  symbol: string
  side: 'buy' | 'sell'
  orderType: 'market' | 'limit'
  quantity: number
  limitPriceNaira?: number      // API expects Naira, not Kobo
  validity?: 'day' | 'gtc' | 'ioc' | 'fok'
}

export const ordersApi = {
  list: () => apiFetch<{ orders: Order[] }>('/orders'),
  place: (payload: PlaceOrderPayload) =>
    apiFetch<{ order: Order }>('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  // Cancel uses DELETE method
  cancel: (id: string) =>
    apiFetch<{ order: Order }>(`/orders/${id}`, { method: 'DELETE' }),
}

// ─── Market ───────────────────────────────────────────────────────────
// Returned by /market/search and /market/instruments
export interface InstrumentLite {
  symbol: string
  name: string
  sector: string
  lastPriceNaira: number
  isActive: boolean
  isTradingSuspended: boolean
}

// Returned by /market/quote/:symbol
export interface InstrumentQuote {
  symbol: string
  name: string
  lastPriceNaira: number
  prevCloseNaira: number
  changeNaira: number
  changePct: number
  volume: number
  isTradingSuspended: boolean
  lastPriceKobo: number
}

// Returned by /market/movers gainers/losers
export interface Mover {
  symbol: string
  name: string
  lastPriceKobo: number
  prevClosePriceKobo: number
  volume: number
  lastPriceNaira: number
  changePct: number
}

export const marketApi = {
  // search requires q >= 2 chars, else returns []
  search: (q: string) =>
    apiFetch<{ instruments: InstrumentLite[] }>(`/market/search?q=${encodeURIComponent(q)}`),
  // instruments returns all active without min-length restriction
  instruments: (limit = 100) =>
    apiFetch<{ instruments: InstrumentLite[] }>(`/market/instruments?limit=${limit}`),
  movers: () => apiFetch<{ gainers: Mover[]; losers: Mover[] }>('/market/movers'),
  quote: (symbol: string) =>
    apiFetch<InstrumentQuote>(`/market/quote/${symbol}`),
}

// ─── Funds ────────────────────────────────────────────────────────────
export const fundsApi = {
  balance: () => apiFetch<{ cashBalanceKobo: number; cashBalanceNaira: number; dailyWithdrawLimitNaira: number }>('/funds/balance'),
  // API takes amountNaira (not amountKobo)
  deposit: (amountNaira: number, bankReference: string, bankName: string) =>
    apiFetch<{ reference: string; amountNaira: number; newBalanceNaira: number }>('/funds/deposit', {
      method: 'POST',
      body: JSON.stringify({ amountNaira, bankReference, bankName }),
    }),
  withdraw: (amountNaira: number, bankName: string) =>
    apiFetch<{ reference: string; amountNaira: number; newBalanceNaira: number; status: string }>('/funds/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amountNaira, bankName }),
    }),
}

// ─── Notifications ────────────────────────────────────────────────────
export interface AppNotification {
  id: string; clientId: string; type: string
  title: string; message: string; isRead: boolean; createdAt: string
}

export const notificationsApi = {
  list: () => apiFetch<{ notifications: AppNotification[]; unreadCount: number }>('/notifications'),
  markRead: (id: string) =>
    apiFetch<{ ok: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () =>
    apiFetch<{ ok: boolean }>('/notifications/read-all', { method: 'PATCH' }),
}

// ─── Reports ──────────────────────────────────────────────────────────
export const reportsApi = {
  transactions: (params?: { from?: string; to?: string; limit?: number }) => {
    const p = new URLSearchParams()
    if (params?.from)  p.set('from',  params.from)
    if (params?.to)    p.set('to',    params.to)
    if (params?.limit) p.set('limit', String(params.limit))
    return apiFetch<{ transactions: Transaction[]; count: number }>(
      `/reports/transactions${p.toString() ? '?' + p : ''}`,
    )
  },
  csvUrl: (params?: { from?: string; to?: string }) => {
    const p = new URLSearchParams({ format: 'csv' })
    if (params?.from) p.set('from', params.from)
    if (params?.to)   p.set('to',   params.to)
    const token = localStorage.getItem('access_token') ?? ''
    return `${BASE}/reports/transactions?${p}&_token=${encodeURIComponent(token)}`
  },
}

// ─── Admin ────────────────────────────────────────────────────────────

export interface AdminClientRow {
  id: string; email: string; fullName: string; phone: string; role: string
  bvn?: string | null; nin?: string | null; chn?: string | null
  kycTier: string; kycStatus: string; cashBalanceKobo: number; cashBalanceNaira: number
  isActive: boolean; isSuspended: boolean; createdAt: string; lastLoginAt: string | null
}

export interface AdminOrderRow {
  orderId: string; clOrdId: string; ngxOrderId: string | null
  clientId: string; clientName: string | null; clientEmail: string | null
  symbol: string; side: string; orderType: string
  quantity: number; filledQty: number; limitPriceKobo: number | null
  totalCostKobo: number | null; status: string; rejectReason: string | null
  createdAt: string; submittedAt: string | null; filledAt: string | null
}

export interface AdminInstrument {
  id: string; symbol: string; name: string; isin: string | null; sector: string | null; type: string
  lastPriceKobo: number; prevClosePriceKobo: number; openPriceKobo: number
  upperLimitKobo: number | null; lowerLimitKobo: number | null; volume: number
  isActive: boolean; isTradingSuspended: boolean; priceUpdatedAt: string | null; updatedAt: string
}

export interface AuditLogEntry {
  id: string; clientId: string | null; actorId: string | null; actorName: string | null
  action: string; entityType: string | null; entityId: string | null
  details: Record<string, unknown> | null; ipAddress: string | null; createdAt: string
}

export interface AdminTransaction {
  id: string; clientId: string; clientName: string | null; clientEmail: string | null
  orderId: string | null; type: string; amountKobo: number; balanceAfterKobo: number
  reference: string; description: string | null; bankName: string | null; createdAt: string
}

export interface AdminMetrics {
  orders:    Record<string, number>
  clients:   Record<string, number>
  portfolio: Record<string, number>
}

function qs(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v))
  }
  return q.toString() ? `?${q}` : ''
}

export const adminApi = {
  metrics: () =>
    apiFetch<AdminMetrics>('/admin/metrics'),

  clients: (p?: { limit?: number; offset?: number; kycStatus?: string; suspended?: boolean; search?: string }) =>
    apiFetch<{ clients: AdminClientRow[]; count: number }>(
      `/admin/clients${qs({ limit: p?.limit, offset: p?.offset, kycStatus: p?.kycStatus, suspended: p?.suspended !== undefined ? String(p.suspended) as never : undefined, search: p?.search })}`
    ),

  client: (id: string) =>
    apiFetch<{ client: AdminClientRow; orderStats: Record<string, number>; recentOrders: AdminOrderRow[]; positions: Record<string, unknown>[]; recentTransactions: Record<string, unknown>[]; kycLogs: Record<string, unknown>[] }>(`/admin/clients/${id}`),

  updateKyc: (id: string, data: { kycStatus: string; kycTier?: string; notes?: string }) =>
    apiFetch<{ id: string; kycStatus: string }>(`/admin/clients/${id}/kyc`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  suspendClient: (id: string, data: { isSuspended: boolean; reason?: string }) =>
    apiFetch<{ id: string; isSuspended: boolean }>(`/admin/clients/${id}/suspend`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  changeRole: (id: string, data: { role: string }) =>
    apiFetch<{ id: string; role: string }>(`/admin/clients/${id}/role`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  kycQueue: () =>
    apiFetch<{ queue: Record<string, string>[]; count: number }>('/admin/kyc-queue'),

  orders: (p?: { limit?: number; offset?: number; status?: string }) =>
    apiFetch<{ orders: AdminOrderRow[]; count: number; offset: number }>(
      `/admin/orders${qs({ limit: p?.limit, offset: p?.offset, status: p?.status })}`
    ),

  updateOrder: (id: string, data: { status: string; rejectReason?: string; ngxOrderId?: string }) =>
    apiFetch<{ id: string; status: string }>(`/admin/orders/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  instruments: () =>
    apiFetch<{ instruments: AdminInstrument[] }>('/admin/instruments'),

  createInstrument: (data: Record<string, unknown>) =>
    apiFetch<{ instrument: AdminInstrument }>('/admin/instruments', {
      method: 'POST', body: JSON.stringify(data),
    }),

  updateInstrument: (symbol: string, data: Record<string, unknown>) =>
    apiFetch<{ instrument: AdminInstrument }>(`/admin/instruments/${symbol}`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),

  transactions: (p?: { limit?: number; offset?: number }) =>
    apiFetch<{ transactions: AdminTransaction[]; count: number }>(
      `/admin/transactions${qs({ limit: p?.limit, offset: p?.offset })}`
    ),

  auditLog: (p?: { limit?: number; offset?: number; action?: string }) =>
    apiFetch<{ logs: AuditLogEntry[]; count: number }>(
      `/admin/audit-log${qs({ limit: p?.limit, offset: p?.offset, action: p?.action })}`
    ),

  getMode: () =>
    apiFetch<{ mode: string; fixConnected: boolean; fixLoggedOn: boolean }>('/admin/mode'),

  setMode: (mode: 'demo' | 'live') =>
    apiFetch<{ mode: string; prev: string; fixConnected: boolean; fixLoggedOn: boolean }>('/admin/mode', {
      method: 'POST', body: JSON.stringify({ mode }),
    }),

  getSettings: () =>
    apiFetch<{ settings: Record<string, unknown> }>('/admin/settings'),

  updateSettings: (settings: Record<string, unknown>) =>
    apiFetch<{ settings: Record<string, unknown> }>('/admin/settings', {
      method: 'PATCH', body: JSON.stringify({ settings }),
    }),
}

// ─── Helpers ──────────────────────────────────────────────────────────
export const fmtKobo = (k: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(k / 100)

export const fmtNaira = (n: number) =>
  `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
