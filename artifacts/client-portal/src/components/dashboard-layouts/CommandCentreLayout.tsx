import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'
import { Clock, TrendingUp, TrendingDown } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import {
  portfolioApi, ordersApi, marketApi,
  fmtKobo,
  type Holding, type Order,
} from '@/lib/api'

const C = {
  bg:     '#0b0e11',
  card:   '#111821',
  green:  '#0ecb81',
  red:    '#f6465d',
  amber:  '#f0b90b',
  border: 'rgba(14,203,129,0.12)',
  text:   '#eaecef',
  muted:  '#848e9c',
}

function StatCard({ title, value, sub, trend }: {
  title: string; value: string; sub?: string; trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="flex flex-col justify-between p-3 border rounded" style={{ backgroundColor: C.card, borderColor: C.border }}>
      <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: C.muted }}>{title}</div>
      <div className="text-lg font-bold tabular-nums leading-tight" style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] mt-1.5" style={{ color: trend === 'up' ? C.green : trend === 'down' ? C.red : C.muted }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function timeAgo(s: string) {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function isMarketOpen() {
  const now = new Date()
  const d = now.getDay()
  if (d === 0 || d === 6) return false
  const mins = now.getHours() * 60 + now.getMinutes()
  return mins >= 570 && mins < 1020
}

export default function CommandCentreLayout() {
  const [, navigate] = useLocation()
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy')
  const [selectedSymbol, setSelectedSymbol] = useState('DANGOTE')

  const { data: summary } = useQuery({
    queryKey: ['portfolio-summary'], queryFn: portfolioApi.summary, refetchInterval: 30_000,
  })
  const { data: holdingsData } = useQuery({
    queryKey: ['holdings'], queryFn: portfolioApi.holdings,
  })
  const { data: chartData } = useQuery({
    queryKey: ['portfolio-chart'], queryFn: portfolioApi.chart, refetchInterval: 60_000,
  })
  const { data: moversData } = useQuery({
    queryKey: ['market-movers'], queryFn: marketApi.movers, refetchInterval: 60_000,
  })
  const { data: ordersData } = useQuery({
    queryKey: ['orders'], queryFn: ordersApi.list, refetchInterval: 15_000,
  })
  const { data: orderBook } = useQuery({
    queryKey: ['orderbook', selectedSymbol],
    queryFn: () => marketApi.orderbook(selectedSymbol),
    refetchInterval: 10_000,
    retry: false,
  })

  const holdings   = holdingsData?.holdings ?? []
  const allOrders  = ordersData?.orders ?? []
  const openOrders = allOrders.filter(o => ['pending', 'partial'].includes(o.status))
  const recent     = allOrders.slice(0, 6)
  const gainers    = moversData?.gainers ?? []
  const losers     = moversData?.losers ?? []
  const pnlUp      = (summary?.unrealisedPnlKobo ?? 0) >= 0

  const chartPoints = (chartData?.points ?? []).slice(-30).map(p => ({
    date:  new Date(p.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }),
    value: p.valueKobo,
  }))

  const symbolOptions = holdings.length > 0
    ? holdings.map(h => h.symbol)
    : ['DANGOTE', 'GTCO', 'ZENITH', 'MTNN', 'SEPLAT']

  const asks = orderBook?.asks ?? []
  const bids = orderBook?.bids ?? []
  const maxAskQty = Math.max(...asks.map(a => a.quantity), 1)
  const maxBidQty = Math.max(...bids.map(b => b.quantity), 1)

  return (
    <div className="space-y-2" style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');`}</style>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard
          title="Portfolio Value"
          value={summary ? fmtKobo(summary.totalPortfolioKobo) : '—'}
          sub={summary ? `P&L: ${pnlUp ? '+' : ''}${summary.pnlPercent.toFixed(2)}%` : 'Loading…'}
          trend={pnlUp ? 'up' : 'down'}
        />
        <StatCard
          title="Cash Balance"
          value={summary ? fmtKobo(summary.cashBalanceKobo) : '—'}
          sub="Available to invest"
          trend="neutral"
        />
        <StatCard
          title="Unrealised P&L"
          value={summary ? `${pnlUp ? '+' : ''}${fmtKobo(summary.unrealisedPnlKobo)}` : '—'}
          sub={summary ? `${pnlUp ? '+' : ''}${summary.pnlPercent.toFixed(2)}% return` : ''}
          trend={pnlUp ? 'up' : 'down'}
        />
        <StatCard
          title="Open Orders"
          value={String(openOrders.length)}
          sub={openOrders.length > 0
            ? `${openOrders.filter(o => o.side === 'buy').length} buy / ${openOrders.filter(o => o.side === 'sell').length} sell`
            : 'None pending'}
          trend="neutral"
        />
      </div>

      {/* ── Chart + Order Book ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-2">
        {/* Chart */}
        <div className="border rounded p-3" style={{ backgroundColor: C.card, borderColor: C.border }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: C.muted }}>
                Portfolio Performance (30d)
              </div>
              <div className="text-xl font-bold tabular-nums" style={{ color: C.text }}>
                {summary ? fmtKobo(summary.totalPortfolioKobo) : '—'}
              </div>
            </div>
            {summary && (
              <div
                className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded"
                style={{
                  backgroundColor: pnlUp ? `${C.green}20` : `${C.red}20`,
                  color: pnlUp ? C.green : C.red,
                }}
              >
                {pnlUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {pnlUp ? '+' : ''}{summary.pnlPercent.toFixed(2)}%
              </div>
            )}
          </div>
          {chartPoints.length >= 2 ? (
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={chartPoints} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ccGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={pnlUp ? C.green : C.red} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={pnlUp ? C.green : C.red} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="rounded px-2 py-1 text-xs border" style={{ backgroundColor: '#1e2329', borderColor: C.border, color: C.green }}>
                        {fmtKobo(payload[0].value as number)}
                      </div>
                    ) : null
                  }
                />
                <Area
                  type="monotone" dataKey="value"
                  stroke={pnlUp ? C.green : C.red} strokeWidth={1.5}
                  fill="url(#ccGrad)" dot={false} isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-36 flex items-center justify-center text-xs" style={{ color: C.muted }}>
              No chart data yet — make trades to see history
            </div>
          )}
        </div>

        {/* Order Book */}
        <div className="border rounded flex flex-col overflow-hidden" style={{ backgroundColor: C.card, borderColor: C.border, minHeight: 220 }}>
          <div className="flex items-center justify-between px-3 py-2 border-b shrink-0" style={{ borderColor: C.border }}>
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: C.text }}>
              Order Book
            </span>
            <select
              className="text-xs bg-transparent outline-none cursor-pointer"
              style={{ color: C.muted }}
              value={selectedSymbol}
              onChange={e => setSelectedSymbol(e.target.value)}
            >
              {symbolOptions.map(s => (
                <option key={s} value={s} style={{ backgroundColor: C.card }}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-between px-3 py-1 text-[9px] uppercase tracking-widest border-b shrink-0" style={{ color: C.muted, borderColor: C.border }}>
            <span>Price (₦)</span><span>Qty</span>
          </div>
          <div className="flex-1 overflow-auto text-xs">
            {asks.slice(0, 5).reverse().map((level, i) => (
              <div key={`ask-${i}`} className="relative flex justify-between px-3 py-1.5 hover:bg-white/5">
                <div className="absolute inset-y-0 right-0 opacity-10 bg-red-500"
                  style={{ width: `${(level.quantity / maxAskQty) * 100}%`, backgroundColor: C.red }} />
                <span className="relative z-10" style={{ color: C.red }}>{level.priceNaira.toFixed(2)}</span>
                <span className="relative z-10" style={{ color: C.text }}>{level.quantity.toLocaleString()}</span>
              </div>
            ))}
            {orderBook && (
              <div className="flex justify-center py-1 text-[9px] border-y" style={{ borderColor: C.border, color: C.green }}>
                ↕ Spread ₦{orderBook.spreadNaira.toFixed(2)}
              </div>
            )}
            {bids.slice(0, 5).map((level, i) => (
              <div key={`bid-${i}`} className="relative flex justify-between px-3 py-1.5 hover:bg-white/5">
                <div className="absolute inset-y-0 right-0 opacity-10"
                  style={{ width: `${(level.quantity / maxBidQty) * 100}%`, backgroundColor: C.green }} />
                <span className="relative z-10" style={{ color: C.green }}>{level.priceNaira.toFixed(2)}</span>
                <span className="relative z-10" style={{ color: C.text }}>{level.quantity.toLocaleString()}</span>
              </div>
            ))}
            {!orderBook && (
              <div className="flex items-center justify-center py-6 text-xs" style={{ color: C.muted }}>
                Loading…
              </div>
            )}
            {orderBook && asks.length === 0 && bids.length === 0 && (
              <div className="flex items-center justify-center py-6 text-xs" style={{ color: C.muted }}>
                No book data for {selectedSymbol}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Holdings + Movers + Quick Order ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-2">
        {/* Holdings table */}
        <div className="border rounded overflow-hidden" style={{ backgroundColor: C.card, borderColor: C.border }}>
          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: C.border }}>
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: C.text }}>Holdings</span>
            <button onClick={() => navigate('/portfolio')} className="text-[10px] transition-opacity hover:opacity-70" style={{ color: C.green }}>
              View all →
            </button>
          </div>
          {holdings.length === 0 ? (
            <div className="px-3 py-8 text-xs text-center" style={{ color: C.muted }}>
              No holdings yet —{' '}
              <button onClick={() => navigate('/trade')} className="underline" style={{ color: C.green }}>
                start trading
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: C.border }}>
                    {['Symbol', 'Qty', 'Avg Cost', 'Last', 'Mkt Value', 'P&L %'].map((h, i) => (
                      <th
                        key={h}
                        className={`py-2 px-3 text-[9px] uppercase tracking-widest font-normal ${i > 0 ? 'text-right' : 'text-left'} ${i === 2 || i === 4 ? 'hidden lg:table-cell' : ''}`}
                        style={{ color: C.muted }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdings.slice(0, 8).map((h: Holding) => (
                    <tr
                      key={h.symbol}
                      className="border-b hover:bg-white/5 cursor-pointer transition-colors"
                      style={{ borderColor: C.border }}
                      onClick={() => navigate('/portfolio')}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold" style={{ color: C.text }}>{h.symbol}</div>
                        {h.instrumentName && (
                          <div className="text-[9px] truncate max-w-[100px]" style={{ color: C.muted }}>{h.instrumentName}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: C.text }}>
                        {h.quantity.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums hidden lg:table-cell" style={{ color: C.muted }}>
                        ₦{h.avgCostKobo ? (h.avgCostKobo / 100).toFixed(2) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: C.text }}>
                        ₦{(h.currentPriceKobo / 100).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums hidden lg:table-cell" style={{ color: C.text }}>
                        {fmtKobo(h.marketValueKobo)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-[10px] font-bold" style={{ color: h.pnlPercent >= 0 ? C.green : C.red }}>
                          {h.pnlPercent >= 0 ? '+' : ''}{h.pnlPercent.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right sidebar: Movers + Quick Order */}
        <div className="space-y-2">
          {/* Market Movers */}
          <div className="border rounded overflow-hidden" style={{ backgroundColor: C.card, borderColor: C.border }}>
            <div className="px-3 py-2 border-b" style={{ borderColor: C.border }}>
              <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: C.text }}>Market Movers</span>
            </div>
            <div>
              {[
                ...gainers.slice(0, 3).map(m => ({ ...m, isGainer: true  })),
                ...losers.slice(0, 3) .map(m => ({ ...m, isGainer: false })),
              ].map(m => (
                <button
                  key={`${m.symbol}-${m.isGainer}`}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors border-b text-left"
                  style={{ borderColor: C.border }}
                  onClick={() => navigate('/trade')}
                >
                  <div>
                    <div className="text-xs font-bold" style={{ color: C.text }}>{m.symbol}</div>
                    <div className="text-[9px] truncate max-w-[120px]" style={{ color: C.muted }}>{m.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs tabular-nums" style={{ color: C.text }}>₦{Number(m.lastPriceNaira).toFixed(2)}</div>
                    <div className="text-[10px] font-bold" style={{ color: m.isGainer ? C.green : C.red }}>
                      {m.isGainer ? '+' : ''}{Math.abs(m.changePct).toFixed(2)}%
                    </div>
                  </div>
                </button>
              ))}
              {gainers.length === 0 && losers.length === 0 && (
                <div className="px-3 py-4 text-xs text-center" style={{ color: C.muted }}>Loading…</div>
              )}
            </div>
          </div>

          {/* Quick Order */}
          <div className="border rounded p-3" style={{ backgroundColor: C.card, borderColor: C.border }}>
            <div className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: C.text }}>Quick Order</div>
            <div className="flex rounded overflow-hidden mb-3" style={{ backgroundColor: C.bg }}>
              {(['buy', 'sell'] as const).map(side => (
                <button
                  key={side}
                  onClick={() => setOrderSide(side)}
                  className="flex-1 py-1.5 text-xs uppercase font-bold tracking-widest transition-colors"
                  style={{
                    backgroundColor: orderSide === side ? (side === 'buy' ? C.green : C.red) : 'transparent',
                    color: orderSide === side ? C.bg : C.muted,
                  }}
                >
                  {side}
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate('/trade')}
              className="w-full py-2 text-xs uppercase font-bold tracking-widest rounded transition-opacity hover:opacity-90"
              style={{ backgroundColor: orderSide === 'buy' ? C.green : C.red, color: C.bg }}
            >
              Open Trade Desk →
            </button>
            <p className="text-[9px] text-center mt-2" style={{ color: C.muted }}>
              Full order entry on the Trade page
            </p>
          </div>
        </div>
      </div>

      {/* ── Recent Orders ── */}
      <div className="border rounded overflow-hidden" style={{ backgroundColor: C.card, borderColor: C.border }}>
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: C.border }}>
          <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: C.text }}>Recent Orders</span>
          <button onClick={() => navigate('/orders')} className="text-[10px] transition-opacity hover:opacity-70" style={{ color: C.green }}>
            All orders →
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="px-3 py-6 text-xs text-center" style={{ color: C.muted }}>No orders yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: C.border }}>
                  {['Time', 'Symbol', 'Side', 'Qty', 'Price', 'Status'].map((h, i) => (
                    <th
                      key={h}
                      className={`py-2 px-3 text-[9px] uppercase tracking-widest font-normal ${i > 0 ? 'text-right' : 'text-left'}`}
                      style={{ color: C.muted }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((o: Order) => (
                  <tr
                    key={o.id}
                    className="border-b hover:bg-white/5 cursor-pointer transition-colors"
                    style={{ borderColor: C.border }}
                    onClick={() => navigate('/orders')}
                  >
                    <td className="py-2 px-3 text-[10px]" style={{ color: C.muted }}>{timeAgo(o.createdAt)}</td>
                    <td className="py-2 px-3 text-right font-bold" style={{ color: C.text }}>{o.symbol}</td>
                    <td className="py-2 px-3 text-right font-bold" style={{ color: o.side === 'buy' ? C.green : C.red }}>
                      {o.side.toUpperCase()}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums" style={{ color: C.text }}>
                      {o.quantity.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums" style={{ color: C.muted }}>
                      {o.limitPriceKobo ? `₦${(o.limitPriceKobo / 100).toFixed(2)}` : 'MKT'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor:
                            o.status === 'filled'  ? `${C.green}20` :
                            ['pending', 'partial'].includes(o.status) ? `${C.amber}20` : `${C.red}20`,
                          color:
                            o.status === 'filled'  ? C.green :
                            ['pending', 'partial'].includes(o.status) ? C.amber : C.red,
                        }}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div
        className="flex items-center justify-between px-3 py-2 border rounded text-[10px]"
        style={{ backgroundColor: C.card, borderColor: C.border, color: C.muted }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" style={{ color: isMarketOpen() ? C.green : C.muted }}>
            <span
              className={`w-1.5 h-1.5 rounded-full ${isMarketOpen() ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: isMarketOpen() ? C.green : C.muted }}
            />
            {isMarketOpen() ? 'MARKET OPEN' : 'MARKET CLOSED'}
          </div>
          <span className="border-l pl-3" style={{ borderColor: C.border }}>NGX</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date().toLocaleTimeString('en-NG', { timeZone: 'Africa/Lagos', hour12: false })} WAT
        </div>
      </div>
    </div>
  )
}
