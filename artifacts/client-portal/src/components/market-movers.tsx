import { useState } from 'react'
import { TrendingUp, TrendingDown, Loader2, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'
import { marketApi, type Mover } from '@/lib/api'

type Tab = 'gainers' | 'losers'

function MoverRow({ mover, isGainer, rank }: { mover: Mover; isGainer: boolean; rank: number }) {
  const [, navigate] = useLocation()
  return (
    <button
      onClick={() => navigate('/trade')}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group text-left"
    >
      <span className="text-[10px] text-muted-foreground w-4 font-mono shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground tracking-wide leading-tight">{mover.symbol}</p>
        <p className="text-[10px] text-muted-foreground truncate leading-tight">{mover.name}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-mono font-semibold text-foreground">₦{Number(mover.lastPriceNaira).toFixed(2)}</p>
        <div className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
          isGainer ? 'bg-[#0ecb81]/15 text-[#0ecb81]' : 'bg-[#f6465d]/15 text-[#f6465d]'
        }`}>
          {isGainer ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          {isGainer ? '+' : ''}{Math.abs(mover.changePct).toFixed(2)}%
        </div>
      </div>
    </button>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="w-4 h-2.5 bg-border/50 rounded animate-pulse" />
      <div className="flex-1 space-y-1">
        <div className="h-2.5 w-16 bg-border/60 rounded animate-pulse" />
        <div className="h-2 w-24 bg-border/40 rounded animate-pulse" />
      </div>
      <div className="space-y-1 text-right">
        <div className="h-2.5 w-14 bg-border/60 rounded animate-pulse ml-auto" />
        <div className="h-4 w-12 bg-border/40 rounded animate-pulse ml-auto" />
      </div>
    </div>
  )
}

export default function MarketMovers() {
  const [tab, setTab] = useState<Tab>('gainers')
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['market-movers'],
    queryFn: marketApi.movers,
    refetchInterval: 60_000,
  })

  const list = tab === 'gainers' ? (data?.gainers ?? []) : (data?.losers ?? [])

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border">
        <div className="flex gap-0.5 bg-muted/40 rounded-md p-0.5">
          {(['gainers', 'losers'] as Tab[]).map(t => (
            <button key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded text-[11px] font-semibold capitalize transition-all ${
                tab === t
                  ? t === 'gainers'
                    ? 'bg-[#0ecb81] text-[#0b0e11] shadow-sm'
                    : 'bg-[#f6465d] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'gainers' ? '▲ Gainers' : '▼ Losers'}
            </button>
          ))}
        </div>
        {isError
          ? <button onClick={() => refetch()} className="text-muted-foreground hover:text-primary transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          : isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        }
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 px-4 py-1.5 border-b border-border/50">
          <span className="w-4" />
          <span className="flex-1 text-[9px] uppercase tracking-widest text-muted-foreground font-medium">Symbol</span>
          <div className="text-right shrink-0">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium">Price / Chg</span>
          </div>
        </div>
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
          : list.length > 0
            ? list.slice(0, 10).map((m, i) => (
                <MoverRow key={m.symbol} mover={m} isGainer={tab === 'gainers'} rank={i + 1} />
              ))
            : (
              <p className="text-xs text-muted-foreground text-center py-8">No data available</p>
            )
        }
      </div>
    </div>
  )
}
