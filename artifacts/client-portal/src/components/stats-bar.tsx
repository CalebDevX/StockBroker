import { TrendingUp, TrendingDown, Wallet, BarChart2, Layers, DollarSign } from 'lucide-react'
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
    <div className="flex items-center gap-3 flex-1 px-5 py-4 border-r border-border last:border-r-0">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        accent ? 'bg-[#0ecb81]/15' : 'bg-muted/60'
      }`}>
        <Icon className={`w-4 h-4 ${accent ? 'text-[#0ecb81]' : 'text-muted-foreground'}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">{label}</p>
        {loading
          ? <div className="h-5 w-24 bg-border/50 rounded animate-pulse" />
          : <p className="text-sm font-bold text-foreground font-mono tabular-nums leading-tight">{value}</p>
        }
        {sub && !loading && (
          <div className={`flex items-center gap-0.5 mt-0.5 text-[10px] font-semibold ${
            trend === 'up' ? 'text-[#0ecb81]' : trend === 'down' ? 'text-[#f6465d]' : 'text-muted-foreground'
          }`}>
            {trend === 'up' && <TrendingUp className="w-2.5 h-2.5" />}
            {trend === 'down' && <TrendingDown className="w-2.5 h-2.5" />}
            {sub}
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
    <div className="flex bg-card border border-border rounded-lg overflow-hidden divide-x divide-border">
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
        icon={TrendingUp}
        label="Unrealised P&L"
        value={data ? `${pnlUp ? '+' : ''}${fmtKobo(data.unrealisedPnlKobo)}` : '—'}
        sub={data ? `${pnlUp ? '+' : ''}${data.pnlPercent.toFixed(2)}% total return` : ''}
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
  )
}
