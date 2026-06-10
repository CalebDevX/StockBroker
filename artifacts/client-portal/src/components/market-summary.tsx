import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react'
import { marketApi } from '@/lib/api'

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export default function MarketSummary() {
  const { data, isLoading } = useQuery({
    queryKey: ['market-summary'],
    queryFn: marketApi.summary,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const total = data?.total ?? 0
  const adv   = data?.advancers ?? 0
  const dec   = data?.decliners ?? 0
  const unch  = data?.unchanged ?? 0
  const vol   = data?.totalVolume ?? 0

  const advPct = total > 0 ? (adv / total) * 100 : 0
  const decPct = total > 0 ? (dec / total) * 100 : 0
  const unchPct = 100 - advPct - decPct

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">

        {/* Label */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Activity className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            NGX Market
          </span>
        </div>

        {/* Breadth bar */}
        {!isLoading && total > 0 && (
          <div className="flex items-center gap-1 flex-1 min-w-[120px]">
            <div className="flex h-1.5 rounded-full overflow-hidden flex-1 gap-px">
              <div
                className="bg-[#0ecb81] rounded-l-full transition-all"
                style={{ width: `${advPct}%` }}
              />
              <div
                className="bg-[#848e9c]/40 transition-all"
                style={{ width: `${unchPct}%` }}
              />
              <div
                className="bg-[#f6465d] rounded-r-full transition-all"
                style={{ width: `${decPct}%` }}
              />
            </div>
          </div>
        )}
        {isLoading && (
          <div className="h-1.5 flex-1 min-w-[120px] rounded-full bg-border/40 animate-pulse" />
        )}

        {/* Advancers */}
        <div className="flex items-center gap-1 shrink-0">
          <TrendingUp className="w-3 h-3 text-[#0ecb81]" />
          {isLoading
            ? <div className="h-3 w-8 bg-border/40 rounded animate-pulse" />
            : <span className="text-xs font-semibold text-[#0ecb81] tabular-nums">{adv}</span>
          }
          <span className="text-[10px] text-muted-foreground">up</span>
        </div>

        {/* Decliners */}
        <div className="flex items-center gap-1 shrink-0">
          <TrendingDown className="w-3 h-3 text-[#f6465d]" />
          {isLoading
            ? <div className="h-3 w-8 bg-border/40 rounded animate-pulse" />
            : <span className="text-xs font-semibold text-[#f6465d] tabular-nums">{dec}</span>
          }
          <span className="text-[10px] text-muted-foreground">down</span>
        </div>

        {/* Unchanged */}
        <div className="flex items-center gap-1 shrink-0">
          <Minus className="w-3 h-3 text-muted-foreground" />
          {isLoading
            ? <div className="h-3 w-8 bg-border/40 rounded animate-pulse" />
            : <span className="text-xs font-semibold text-muted-foreground tabular-nums">{unch}</span>
          }
          <span className="text-[10px] text-muted-foreground">flat</span>
        </div>

        {/* Volume */}
        <div className="hidden sm:flex items-center gap-1 shrink-0 ml-auto">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Vol</span>
          {isLoading
            ? <div className="h-3 w-14 bg-border/40 rounded animate-pulse" />
            : <span className="text-xs font-semibold text-foreground font-mono tabular-nums">{fmt(vol)}</span>
          }
        </div>

      </div>
    </div>
  )
}
