import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'
import {
  TrendingUp, TrendingDown,
  ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, FileText, ChevronRight,
} from 'lucide-react'
import { portfolioApi, marketApi, fmtKobo, type Holding, type SectorSlice } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

const SLICE_COLORS = ['#0ecb81', '#3b82f6', '#8b5cf6', '#f0b90b', '#f6465d', '#06b6d4', '#ec4899', '#84cc16']

function DonutChart({ sectors }: { sectors: SectorSlice[] }) {
  let cum = 0
  const segs = sectors.map((s, i) => {
    const start = cum
    cum += s.percentage
    return { ...s, start, end: cum, color: SLICE_COLORS[i % SLICE_COLORS.length] }
  })
  const gradient = segs.length
    ? segs.map(s => `${s.color} ${s.start.toFixed(1)}% ${s.end.toFixed(1)}%`).join(', ')
    : '#2b3139 0% 100%'

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        className="relative w-36 h-36 rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
      >
        <div
          className="absolute inset-4 rounded-full flex flex-col items-center justify-center"
          style={{ backgroundColor: '#111821' }}
        >
          <span className="text-[10px] text-slate-400">Stocks</span>
          <span className="text-xl font-bold text-white">{sectors.length}</span>
        </div>
      </div>
      <div className="space-y-2 w-full">
        {segs.slice(0, 6).map(s => (
          <div key={s.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-slate-300 truncate max-w-[110px] text-xs">{s.name}</span>
            </div>
            <span className="text-white font-bold text-xs tabular-nums">{s.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

export default function WealthOverviewLayout() {
  const [, navigate] = useLocation()
  const { user } = useAuth()
  const firstName = user?.fullName?.split(' ')[0] ?? 'there'

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['portfolio-summary'], queryFn: portfolioApi.summary, refetchInterval: 30_000,
  })
  const { data: holdingsData } = useQuery({
    queryKey: ['holdings'], queryFn: portfolioApi.holdings,
  })
  const { data: sectorData } = useQuery({
    queryKey: ['sector-allocation'], queryFn: portfolioApi.sectorAllocation,
  })
  const { data: moversData } = useQuery({
    queryKey: ['market-movers'], queryFn: marketApi.movers, refetchInterval: 60_000,
  })

  const holdings = holdingsData?.holdings ?? []
  const sectors  = sectorData?.sectors ?? []
  const pnlUp    = (summary?.unrealisedPnlKobo ?? 0) >= 0

  const sorted = [...holdings].sort((a, b) => b.pnlPercent - a.pnlPercent)
  const best   = sorted[0]
  const worst  = sorted[sorted.length - 1]

  const quickActions = [
    { label: 'Deposit',   icon: ArrowDownToLine, href: '/funds'   },
    { label: 'Withdraw',  icon: ArrowUpFromLine,  href: '/funds'   },
    { label: 'Trade',     icon: ArrowRightLeft,   href: '/trade'   },
    { label: 'Statement', icon: FileText,          href: '/reports' },
  ]

  return (
    <div className="space-y-5 pb-4">

      {/* ── Hero ── */}
      <div className="rounded-2xl p-6 md:p-8 border border-slate-800/60" style={{ backgroundColor: '#111821' }}>
        <p className="text-slate-400 text-sm mb-2">
          Good {getTimeOfDay()}, {firstName}
        </p>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            {sumLoading ? (
              <>
                <div className="h-12 w-56 bg-border/40 rounded-lg animate-pulse mb-3" />
                <div className="h-6 w-40 bg-border/30 rounded animate-pulse" />
              </>
            ) : (
              <>
                <div className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-3 tabular-nums">
                  {summary ? fmtKobo(summary.totalPortfolioKobo) : '—'}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${
                      pnlUp
                        ? 'bg-[#0ecb81]/10 text-[#0ecb81] border-[#0ecb81]/20'
                        : 'bg-[#f6465d]/10 text-[#f6465d] border-[#f6465d]/20'
                    }`}
                  >
                    {pnlUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {summary ? `${pnlUp ? '+' : ''}${fmtKobo(summary.unrealisedPnlKobo)}` : '—'}
                  </div>
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${
                      pnlUp
                        ? 'bg-[#0ecb81]/10 text-[#0ecb81] border-[#0ecb81]/20'
                        : 'bg-[#f6465d]/10 text-[#f6465d] border-[#f6465d]/20'
                    }`}
                  >
                    {summary ? `${pnlUp ? '+' : ''}${summary.pnlPercent.toFixed(2)}% all-time` : '—'}
                  </div>
                  <span className="text-slate-500 text-sm hidden sm:block">
                    Cash: {summary ? fmtKobo(summary.cashBalanceKobo) : '—'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {quickActions.map(({ label, icon: Icon, href }) => (
              <button
                key={label}
                onClick={() => navigate(href)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  label === 'Deposit'
                    ? 'bg-[#0ecb81] text-[#0b0e11] hover:bg-[#0ecb81]/90 shadow-[0_0_16px_rgba(14,203,129,0.2)]'
                    : 'bg-slate-800/60 text-white border border-slate-700 hover:bg-slate-700/60'
                }`}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Insight cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label:      'Best Performer',
            value:      best?.symbol ?? (holdings.length === 0 ? 'No holdings' : '—'),
            metric:     best ? `${best.pnlPercent >= 0 ? '+' : ''}${best.pnlPercent.toFixed(2)}%` : '—',
            isPositive: (best?.pnlPercent ?? 0) >= 0,
          },
          {
            label:      'Worst Performer',
            value:      worst && worst !== best ? worst.symbol : (holdings.length < 2 ? 'No data' : '—'),
            metric:     worst && worst !== best ? `${worst.pnlPercent >= 0 ? '+' : ''}${worst.pnlPercent.toFixed(2)}%` : '—',
            isPositive: (worst?.pnlPercent ?? 0) >= 0,
          },
          {
            label:      'Total Unrealised P&L',
            value:      'Portfolio',
            metric:     summary ? `${pnlUp ? '+' : ''}${fmtKobo(summary.unrealisedPnlKobo)}` : '—',
            isPositive: pnlUp,
          },
        ].map((card, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-slate-800/60"
            style={{ backgroundColor: '#111821' }}
          >
            <p className="text-xs text-slate-400 mb-3">{card.label}</p>
            <div className="flex items-end justify-between gap-2">
              <p className="text-lg font-bold text-white truncate">{card.value}</p>
              <div className={`flex items-center gap-1 font-bold text-sm shrink-0 ${card.isPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                {card.isPositive ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                {card.metric}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Allocation + Holdings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        {/* Donut */}
        <div
          className="p-6 rounded-2xl border border-slate-800/60 flex flex-col"
          style={{ backgroundColor: '#111821' }}
        >
          <h2 className="text-base font-bold text-white mb-6">Allocation</h2>
          {sectors.length > 0 ? (
            <DonutChart sectors={sectors} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400 py-8">
              No positions yet
            </div>
          )}
        </div>

        {/* Holdings cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Holdings</h2>
            <button
              onClick={() => navigate('/portfolio')}
              className="text-sm font-medium text-[#0ecb81] hover:text-white flex items-center gap-1 transition-colors"
            >
              Full portfolio <ChevronRight size={15} />
            </button>
          </div>

          {holdings.length === 0 ? (
            <div
              className="p-8 rounded-2xl border border-slate-800/60 text-center"
              style={{ backgroundColor: '#111821' }}
            >
              <p className="text-slate-400 mb-3 text-sm">No holdings yet</p>
              <button
                onClick={() => navigate('/trade')}
                className="px-5 py-2 rounded-xl bg-[#0ecb81] text-[#0b0e11] text-sm font-bold hover:bg-[#0ecb81]/90 transition-colors"
              >
                Browse Market
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {holdings.slice(0, 6).map((h: Holding) => (
                <button
                  key={h.symbol}
                  onClick={() => navigate('/portfolio')}
                  className="p-4 rounded-2xl border border-slate-800/60 hover:border-slate-600 transition-all text-left group"
                  style={{ backgroundColor: '#111821' }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white text-base group-hover:text-[#0ecb81] transition-colors">
                        {h.symbol}
                      </h3>
                      {h.instrumentName && (
                        <p className="text-xs text-slate-400 truncate">{h.instrumentName}</p>
                      )}
                    </div>
                    {h.sector && (
                      <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-800/80 text-xs text-slate-300 font-medium shrink-0">
                        {h.sector}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-slate-400 mb-0.5">Value</p>
                      <p className="font-semibold text-white text-sm tabular-nums">{fmtKobo(h.marketValueKobo)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 mb-0.5">₦{(h.currentPriceKobo / 100).toFixed(2)}</p>
                      <p className={`font-bold text-sm ${h.pnlPercent >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                        {h.pnlPercent >= 0 ? '+' : ''}{h.pnlPercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Market strip ── */}
      <div
        className="rounded-xl border border-slate-800/60 px-4 py-3 overflow-x-auto"
        style={{ backgroundColor: '#111821' }}
      >
        <div className="flex items-center gap-6 min-w-max text-sm">
          <span className="text-slate-500 text-xs font-bold tracking-widest uppercase shrink-0">
            Today's Movers
          </span>
          {[
            ...(moversData?.gainers ?? []).slice(0, 4),
            ...(moversData?.losers  ?? []).slice(0, 4),
          ].map((m, i) => {
            const isGainer = i < 4
            return (
              <button
                key={`strip-${m.symbol}-${i}`}
                onClick={() => navigate('/trade')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <span className="font-semibold text-slate-300">{m.symbol}</span>
                <span className={`text-xs font-bold ${isGainer ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {isGainer ? '+' : ''}{m.changePct.toFixed(2)}%
                </span>
              </button>
            )
          })}
          {!moversData && (
            <span className="text-slate-500 text-xs">Loading market data…</span>
          )}
        </div>
      </div>
    </div>
  )
}
