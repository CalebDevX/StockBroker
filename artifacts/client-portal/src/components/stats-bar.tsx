import { TrendingUp, TrendingDown, Wallet, BarChart2, Layers } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { portfolioApi, fmtKobo } from '@/lib/api'

interface StatProps {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  loading?: boolean
  accent?: boolean
}

function Stat({ icon: Icon, label, value, sub, trend, loading, accent }: StatProps) {
  return (
    <div className={`flex items-center gap-2.5 p-3 md:p-0 md:flex-1 md:px-4 md:py-3.5 ${accent ? '' : ''}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        accent ? 'bg-[#0ecb81]/15' : 'bg-muted/50'
      }`}>
        <Icon className={`w-3.5 h-3.5 ${accent ? 'text-[#0ecb81]' : 'text-muted-foreground'}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5 leading-none">
          {label}
        </p>
        {loading
          ? <div className="h-4 w-20 bg-border/50 rounded animate-pulse" />
          : <p className="text-sm font-bold text-foreground font-mono tabular-nums leading-tight truncate">{value}</p>
        }
        {sub && !loading && (
          <div className={`flex items-center gap-0.5 mt-0.5 text-[10px] font-semibold leading-none ${
            trend === 'up' ? 'text-[#0ecb81]' : trend === 'down' ? 'text-[#f6465d]' : 'text-muted-foreground'
          }`}>
            {trend === 'up'   && <TrendingUp   className="w-2.5 h-2.5" />}
            {trend === 'down' && <TrendingDown  className="w-2.5 h-2.5" />}
            <span className="truncate">{sub}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StatsBar() {
  const { data, isLoading } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: portfolioApi.summary,
    refetchInterval: 30_000,
  })

  const pnlUp = (data?.unrealisedPnlKobo ?? 0) >= 0

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Mobile: 2×2 grid */}
      <div className="grid grid-cols-2 divide-x divide-y divide-border md:hidden">
        <Stat
          icon={BarChart2}
          label="Portfolio"
          value={data ? fmtKobo(data.totalPortfolioKobo) : '—'}
          sub="Market value + cash"
          trend="neutral"
          loading={isLoading}
          accent
        />
        <Stat
          icon={Wallet}
          label="Cash"
          value={data ? fmtKobo(data.cashBalanceKobo) : '—'}
          sub="Available"
          loading={isLoading}
        />
        <Stat
          icon={pnlUp ? TrendingUp : TrendingDown}
          label="Unrealised P&L"
          value={data ? `${pnlUp ? '+' : ''}${fmtKobo(data.unrealisedPnlKobo)}` : '—'}
          sub={data ? `${pnlUp ? '+' : ''}${data.pnlPercent.toFixed(2)}%` : ''}
          trend={data ? (pnlUp ? 'up' : 'down') : 'neutral'}
          loading={isLoading}
        />
        <Stat
          icon={Layers}
          label="Positions"
          value={data ? String(data.holdingsCount) : '—'}
          sub="Holdings"
          loading={isLoading}
        />
      </div>

      {/* Desktop: horizontal row */}
      <div className="hidden md:flex divide-x divide-border">
        <Stat
          icon={BarChart2}
          label="Portfolio Value"
          value={data ? fmtKobo(data.totalPortfolioKobo) : '—'}
          sub="Market value + cash"
          trend="neutral"
          loading={isLoading}
          accent
        />
        <Stat
          icon={Wallet}
          label="Cash Balance"
          value={data ? fmtKobo(data.cashBalanceKobo) : '—'}
          sub="Available to invest"
          loading={isLoading}
        />
        <Stat
          icon={pnlUp ? TrendingUp : TrendingDown}
          label="Unrealised P&L"
          value={data ? `${pnlUp ? '+' : ''}${fmtKobo(data.unrealisedPnlKobo)}` : '—'}
          sub={data ? `${pnlUp ? '+' : ''}${data.pnlPercent.toFixed(2)}% return` : ''}
          trend={data ? (pnlUp ? 'up' : 'down') : 'neutral'}
          loading={isLoading}
        />
        <Stat
          icon={Layers}
          label="Positions"
          value={data ? String(data.holdingsCount) : '—'}
          sub="Active holdings"
          loading={isLoading}
        />
      </div>
    </div>
  )
}
