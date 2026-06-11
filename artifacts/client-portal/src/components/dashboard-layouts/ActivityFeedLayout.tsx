import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'
import {
  TrendingUp, TrendingDown, Search, X, Clock,
  CheckCircle2, AlertTriangle, Download, Bell, Newspaper,
} from 'lucide-react'
import {
  portfolioApi, ordersApi, marketApi, notificationsApi,
  fmtKobo,
  type Order, type AppNotification,
} from '@/lib/api'

type FeedItem = {
  id:          string
  title:       string
  desc:        string
  time:        Date
  borderColor: string
  icon:        React.ReactNode
}

function buildFeed(orders: Order[], notifications: AppNotification[]): FeedItem[] {
  const items: FeedItem[] = []

  for (const o of orders) {
    const filled = o.status === 'filled'
    const isBuy  = o.side === 'buy'
    const bc     = filled ? (isBuy ? '#0ecb81' : '#f6465d') : '#f0b90b'
    items.push({
      id:    `order-${o.id}`,
      title: `Order ${filled ? 'Filled' : o.status.charAt(0).toUpperCase() + o.status.slice(1)}: ${isBuy ? 'Bought' : 'Sold'} ${o.quantity.toLocaleString()} ${o.symbol}`,
      desc:  o.avgFillPriceKobo
        ? `Filled at ₦${(o.avgFillPriceKobo / 100).toFixed(2)} · Total ${fmtKobo(o.totalCostKobo ?? 0)}`
        : `${o.orderType === 'market' ? 'Market order' : `Limit ₦${o.limitPriceKobo ? (o.limitPriceKobo / 100).toFixed(2) : '—'}`} · ${o.status}`,
      time:        new Date(o.createdAt),
      borderColor: bc,
      icon:        <CheckCircle2 className="w-4 h-4" style={{ color: bc }} />,
    })
  }

  for (const n of notifications) {
    let bc  = '#3b82f6'
    let ico = <Bell className="w-4 h-4" style={{ color: bc }} />
    if (n.type === 'trade_fill')   { bc = '#0ecb81'; ico = <CheckCircle2 className="w-4 h-4" style={{ color: bc }} /> }
    if (n.type === 'price_alert')  { bc = '#f0b90b'; ico = <AlertTriangle className="w-4 h-4" style={{ color: bc }} /> }
    if (n.type === 'deposit' || n.type === 'withdrawal') {
      bc = '#0ecb81'; ico = <Download className="w-4 h-4" style={{ color: bc }} />
    }
    if (n.type === 'kyc_update')   { bc = '#3b82f6'; ico = <Bell className="w-4 h-4" style={{ color: bc }} /> }
    if (n.type === 'market_news')  { bc = '#8b5cf6'; ico = <Newspaper className="w-4 h-4" style={{ color: bc }} /> }

    items.push({
      id:          `notif-${n.id}`,
      title:       n.title,
      desc:        n.message,
      time:        new Date(n.createdAt),
      borderColor: bc,
      icon:        ico,
    })
  }

  return items
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 15)
}

function timeAgo(d: Date) {
  const m = Math.floor((Date.now() - d.getTime()) / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function isMarketOpen() {
  const now = new Date()
  const d = now.getDay()
  if (d === 0 || d === 6) return false
  const mins = now.getHours() * 60 + now.getMinutes()
  return mins >= 570 && mins < 1020
}

export default function ActivityFeedLayout() {
  const [, navigate] = useLocation()

  const { data: summary } = useQuery({
    queryKey: ['portfolio-summary'], queryFn: portfolioApi.summary, refetchInterval: 30_000,
  })
  const { data: ordersData } = useQuery({
    queryKey: ['orders'], queryFn: ordersApi.list, refetchInterval: 15_000,
  })
  const { data: notifData } = useQuery({
    queryKey: ['notifications'], queryFn: notificationsApi.list, refetchInterval: 30_000,
  })
  const { data: moversData } = useQuery({
    queryKey: ['market-movers'], queryFn: marketApi.movers, refetchInterval: 60_000,
  })

  const allOrders  = ordersData?.orders ?? []
  const openOrders = allOrders.filter(o => ['pending', 'partial'].includes(o.status))
  const notifs     = notifData?.notifications ?? []
  const feed       = buildFeed(allOrders, notifs)
  const pnlUp      = (summary?.unrealisedPnlKobo ?? 0) >= 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 min-h-0">

      {/* ── Left column: portfolio snapshot + feed ── */}
      <div className="space-y-3 min-w-0">

        {/* Portfolio snapshot */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">
                Portfolio Value
              </p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl font-bold text-foreground tabular-nums">
                  {summary ? fmtKobo(summary.totalPortfolioKobo) : '—'}
                </span>
                {summary && (
                  <span
                    className={`text-sm font-semibold flex items-center gap-1 px-2 py-0.5 rounded ${
                      pnlUp ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-[#f6465d]/10 text-[#f6465d]'
                    }`}
                  >
                    {pnlUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {pnlUp ? '+' : ''}{summary.pnlPercent.toFixed(2)}% all-time
                  </span>
                )}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-right shrink-0">
              <div>
                <p className="text-[10px] text-muted-foreground">Cash</p>
                <p className="text-sm font-semibold text-foreground tabular-nums">
                  {summary ? fmtKobo(summary.cashBalanceKobo) : '—'}
                </p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-[10px] text-muted-foreground">Positions</p>
                <p className="text-sm font-semibold text-foreground">{summary?.holdingsCount ?? '—'}</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-[10px] text-muted-foreground">Unrealised P&L</p>
                <p className={`text-sm font-semibold tabular-nums ${pnlUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {summary ? `${pnlUp ? '+' : ''}${fmtKobo(summary.unrealisedPnlKobo)}` : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
              Activity Feed
            </p>
            {notifData && notifData.unreadCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0ecb81]/10 text-[#0ecb81]">
                {notifData.unreadCount} unread
              </span>
            )}
          </div>

          {feed.length === 0 ? (
            <div className="py-12 text-center px-6">
              <p className="text-sm text-muted-foreground mb-3">No activity yet</p>
              <button
                onClick={() => navigate('/trade')}
                className="text-xs text-[#0ecb81] hover:underline"
              >
                Place your first order →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {feed.map(item => (
                <div
                  key={item.id}
                  className="flex gap-3 px-4 py-3 hover:bg-muted/10 transition-colors border-l-2"
                  style={{ borderLeftColor: item.borderColor }}
                >
                  <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 flex items-center gap-0.5 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {timeAgo(item.time)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {feed.length > 0 && (
            <div className="px-4 py-3 border-t border-border">
              <button
                onClick={() => navigate('/orders')}
                className="w-full text-xs text-muted-foreground hover:text-[#0ecb81] transition-colors text-center"
              >
                View full order history →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right column ── */}
      <div className="space-y-3 shrink-0">

        {/* Market status pill */}
        <div className="flex justify-end">
          <div
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${
              isMarketOpen()
                ? 'bg-[#0ecb81]/10 text-[#0ecb81] border-[#0ecb81]/20'
                : 'bg-muted/20 text-muted-foreground border-border'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isMarketOpen() ? 'bg-[#0ecb81] animate-pulse' : 'bg-muted-foreground'}`}
            />
            {isMarketOpen() ? 'Market Open' : 'Market Closed'}
          </div>
        </div>

        {/* Quick trade */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Quick Trade</h3>
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2 mb-3">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search ticker (e.g. DANGOTE)…"
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1 min-w-0"
              onKeyDown={e => { if (e.key === 'Enter') navigate('/trade') }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/trade')}
              className="flex-1 py-2 rounded-lg bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-[#0b0e11] font-bold text-sm transition-colors"
            >
              Buy
            </button>
            <button
              onClick={() => navigate('/trade')}
              className="flex-1 py-2 rounded-lg bg-[#f6465d] hover:bg-[#f6465d]/90 text-white font-bold text-sm transition-colors"
            >
              Sell
            </button>
          </div>
        </div>

        {/* Today's movers */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Today's Movers</h3>
            <button
              onClick={() => navigate('/trade')}
              className="text-xs text-[#0ecb81] hover:underline"
            >
              View all
            </button>
          </div>
          <div className="space-y-2.5">
            {[
              ...(moversData?.gainers ?? []).slice(0, 3).map(m => ({ ...m, isGainer: true  })),
              ...(moversData?.losers  ?? []).slice(0, 3).map(m => ({ ...m, isGainer: false })),
            ].map((m, i) => (
              <button
                key={`${m.symbol}-${i}`}
                onClick={() => navigate('/trade')}
                className="w-full flex items-center justify-between hover:bg-muted/20 px-1 py-0.5 rounded transition-colors"
              >
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-foreground">{m.symbol}</p>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{m.name}</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-mono tabular-nums text-foreground">₦{Number(m.lastPriceNaira).toFixed(2)}</p>
                  <p className={`text-xs font-bold ${m.isGainer ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                    {m.isGainer ? '+' : ''}{m.changePct.toFixed(2)}%
                  </p>
                </div>
              </button>
            ))}
            {!moversData && (
              <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
            )}
            {moversData && moversData.gainers.length === 0 && moversData.losers.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Open orders */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              Open Orders ({openOrders.length})
            </h3>
            {openOrders.length > 0 && (
              <button
                onClick={() => navigate('/orders')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all
              </button>
            )}
          </div>
          {openOrders.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No open orders</p>
          ) : (
            <div className="space-y-2">
              {openOrders.slice(0, 5).map((o: Order) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-background/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-[10px] font-bold ${
                          o.side === 'buy' ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                        }`}
                      >
                        {o.side.toUpperCase()}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{o.symbol}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {o.quantity.toLocaleString()} @{' '}
                      {o.limitPriceKobo ? `₦${(o.limitPriceKobo / 100).toFixed(2)}` : 'Market'}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/orders')}
                    className="text-muted-foreground hover:text-[#f6465d] transition-colors p-1 shrink-0"
                    title="Manage order"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
