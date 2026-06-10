import { useQuery } from '@tanstack/react-query'
import { marketApi, type InstrumentLite } from '@/lib/api'
import { TrendingUp, TrendingDown } from 'lucide-react'

function TickerItem({ inst }: { inst: InstrumentLite }) {
  return (
    <span className="inline-flex items-center gap-2 px-5 border-r border-border/50 shrink-0">
      <span className="text-[11px] font-bold text-foreground tracking-wide">{inst.symbol}</span>
      <span className="text-[11px] font-mono text-foreground">₦{inst.lastPriceNaira.toFixed(2)}</span>
    </span>
  )
}

export default function MarketTicker() {
  const { data } = useQuery({
    queryKey: ['ticker-instruments'],
    queryFn: () => marketApi.instruments(60),
    refetchInterval: 30_000,
    staleTime: 20_000,
  })

  const instruments = data?.instruments ?? []
  if (instruments.length === 0) return null

  const doubled = [...instruments, ...instruments]

  return (
    <div className="w-full overflow-hidden bg-card border-b border-border h-8 flex items-center">
      <div className="shrink-0 flex items-center gap-1.5 px-3 border-r border-border h-full bg-[#161b22] z-10">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0ecb81] animate-pulse" />
        <span className="text-[9px] font-bold tracking-widest text-[#0ecb81] uppercase">NGX Live</span>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div className="ticker-track flex items-center h-8 whitespace-nowrap">
          {doubled.map((inst, i) => <TickerItem key={`${inst.symbol}-${i}`} inst={inst} />)}
        </div>
      </div>
    </div>
  )
}
