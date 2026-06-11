import { useQuery } from '@tanstack/react-query'
import { marketApi, type TradeTick } from '@/lib/api'
import { useEffect, useRef, useState } from 'react'
import { ArrowUp, ArrowDown, Activity } from 'lucide-react'

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function TradeRow({ trade, flash }: { trade: TradeTick; flash: boolean }) {
  const isBuy     = trade.side === 'buy'
  const clr       = isBuy ? 'text-[#0ecb81]' : 'text-[#f6465d]'
  const flashBg   = flash
    ? isBuy ? 'bg-[#0ecb81]/10' : 'bg-[#f6465d]/10'
    : ''

  return (
    <div className={`flex items-center text-[11px] font-mono px-3 py-[3.5px] transition-colors duration-300 ${flashBg}`}>
      <span className={`w-[8%] flex-shrink-0 ${clr}`}>
        {isBuy ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      </span>
      <span className={`w-[35%] tabular-nums font-semibold ${clr}`}>
        ₦{trade.priceNaira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span className="w-[32%] text-right tabular-nums text-foreground/80">
        {trade.quantity.toLocaleString()}
      </span>
      <span className="w-[25%] text-right tabular-nums text-muted-foreground text-[10px]">
        {formatTime(trade.timestamp)}
      </span>
    </div>
  )
}

function TapeSkeleton() {
  return (
    <div className="animate-pulse space-y-0.5 px-3 pt-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-2 py-[3.5px]">
          <div className="h-3 w-2.5 bg-muted/30 rounded" />
          <div className="h-3 flex-1 bg-muted/30 rounded" />
          <div className="h-3 w-16 bg-muted/20 rounded" />
          <div className="h-3 w-12 bg-muted/20 rounded" />
        </div>
      ))}
    </div>
  )
}

export default function TradesTape({ symbol }: { symbol: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['trades', symbol],
    queryFn:  () => marketApi.trades(symbol),
    refetchInterval: 3_000,
    enabled: Boolean(symbol),
  })

  const prevRef  = useRef<TradeTick[]>([])
  const [flashSet, setFlashSet] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!data?.trades) return
    const prev    = prevRef.current
    const prevKey = (t: TradeTick) => `${t.timestamp}|${t.priceKobo}|${t.quantity}`
    const prevKeys = new Set(prev.map(prevKey))
    const newKeys  = data.trades
      .filter(t => !prevKeys.has(prevKey(t)))
      .map(prevKey)

    if (newKeys.length > 0) {
      setFlashSet(new Set(newKeys))
      const id = setTimeout(() => setFlashSet(new Set()), 600)
      prevRef.current = data.trades
      return () => clearTimeout(id)
    }
    prevRef.current = data.trades
  }, [data])

  const trades = data?.trades ?? []

  return (
    <div className="rounded-[1.5rem] border border-border/60 bg-[#0b0e11]/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#f0b90b]/10 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-[#f0b90b]" />
          </div>
          <span className="text-xs font-bold tracking-wide text-foreground">Time & Sales</span>
        </div>
        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em]">Last 20</span>
      </div>

      {/* Column headers */}
      <div className="flex items-center text-[9px] uppercase tracking-[0.22em] text-muted-foreground/50 px-3 py-1.5 border-b border-border/20">
        <span className="w-[8%]" />
        <span className="w-[35%]">Price</span>
        <span className="w-[32%] text-right">Size</span>
        <span className="w-[25%] text-right">Time</span>
      </div>

      {/* Body */}
      <div className="min-h-[80px]">
        {isLoading && <TapeSkeleton />}
        {isError && (
          <p className="text-center text-xs text-muted-foreground/60 py-6">Unable to load trades</p>
        )}
        {!isLoading && !isError && trades.length === 0 && (
          <p className="text-center text-xs text-muted-foreground/60 py-6">No recent trades</p>
        )}
        {!isLoading && !isError && trades.map((trade, i) => {
          const key = `${trade.timestamp}|${trade.priceKobo}|${trade.quantity}`
          return (
            <TradeRow
              key={`${symbol}-${i}`}
              trade={trade}
              flash={flashSet.has(key)}
            />
          )
        })}
      </div>
    </div>
  )
}
