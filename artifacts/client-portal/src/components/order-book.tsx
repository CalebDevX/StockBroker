import { useQuery } from '@tanstack/react-query'
import { marketApi, type OrderBook, type OrderBookLevel } from '@/lib/api'
import { BookOpen, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

function DepthBar({ fill, side }: { fill: number; side: 'bid' | 'ask' }) {
  const color = side === 'bid' ? 'bg-[#0ecb81]/20' : 'bg-[#f6465d]/18'
  const glow  = side === 'bid' ? 'shadow-[inset_0_0_6px_rgba(14,203,129,0.15)]' : 'shadow-[inset_0_0_6px_rgba(246,70,93,0.15)]'
  return (
    <div className="absolute inset-y-0 right-0 left-0 overflow-hidden rounded-sm">
      <div
        className={`absolute inset-y-0 right-0 ${color} ${glow} transition-all duration-700`}
        style={{ width: `${Math.min(fill * 100, 100)}%` }}
      />
    </div>
  )
}

function Level({
  level,
  maxTotal,
  side,
  flash,
}: {
  level: OrderBookLevel
  maxTotal: number
  side: 'bid' | 'ask'
  flash: boolean
}) {
  const fill    = maxTotal > 0 ? level.total / maxTotal : 0
  const priceColor = side === 'bid' ? 'text-[#0ecb81]' : 'text-[#f6465d]'
  const flashBg = flash ? (side === 'bid' ? 'bg-[#0ecb81]/10' : 'bg-[#f6465d]/10') : ''

  return (
    <div className={`relative flex items-center text-[11px] font-mono px-3 py-[3.5px] transition-colors duration-300 ${flashBg}`}>
      <DepthBar fill={fill} side={side} />
      <span className={`relative z-10 w-[40%] tabular-nums ${priceColor} font-semibold`}>
        ₦{level.priceNaira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span className="relative z-10 w-[35%] text-right tabular-nums text-foreground/80">
        {level.quantity.toLocaleString()}
      </span>
      <span className="relative z-10 w-[25%] text-right tabular-nums text-muted-foreground text-[10px]">
        {level.total.toLocaleString()}
      </span>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-[3px] px-3 py-1 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-[22px] rounded bg-muted/20" style={{ opacity: 1 - i * 0.09 }} />
      ))}
    </div>
  )
}

interface Props {
  symbol: string
  onPriceClick?: (price: number) => void
}

export default function OrderBookWidget({ symbol, onPriceClick }: Props) {
  const prevDataRef = useRef<OrderBook | null>(null)
  const [flashedLevels, setFlashedLevels] = useState<Set<number>>(new Set())

  const { data, isLoading, isFetching, dataUpdatedAt } = useQuery<OrderBook>({
    queryKey: ['orderbook', symbol],
    queryFn: () => marketApi.orderbook(symbol),
    refetchInterval: 5_000,
    enabled: Boolean(symbol),
    staleTime: 4_000,
  })

  // Detect changed levels and flash them
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    if (data && prevDataRef.current) {
      const prev = prevDataRef.current
      const changed = new Set<number>()
      data.asks.forEach((lvl, i) => {
        const prevLvl = prev.asks[i]
        if (!prevLvl || prevLvl.quantity !== lvl.quantity) changed.add(lvl.priceKobo)
      })
      data.bids.forEach((lvl, i) => {
        const prevLvl = prev.bids[i]
        if (!prevLvl || prevLvl.quantity !== lvl.quantity) changed.add(lvl.priceKobo)
      })
      if (changed.size > 0) {
        setFlashedLevels(changed)
        t = setTimeout(() => setFlashedLevels(new Set()), 600)
      }
    }
    prevDataRef.current = data ?? null
    return () => { if (t !== undefined) clearTimeout(t) }
  }, [dataUpdatedAt])  // eslint-disable-line react-hooks/exhaustive-deps

  const maxAskTotal = data?.asks.at(-1)?.total ?? 1
  const maxBidTotal = data?.bids.at(-1)?.total ?? 1

  const updatedStr = data
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  return (
    <div className="rounded-[1.5rem] border border-[#0ecb81]/12 bg-[#0b0e11]/90 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#0ecb81]/10 border border-[#0ecb81]/15">
            <BookOpen className="w-3.5 h-3.5 text-[#0ecb81]" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground">Order Book</span>
          <span className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">{symbol}</span>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && (
            <RefreshCw className="w-3 h-3 text-[#0ecb81]/60 animate-spin" />
          )}
          {updatedStr && (
            <span className="text-[10px] text-muted-foreground tabular-nums">{updatedStr}</span>
          )}
        </div>
      </div>

      {/* Column labels */}
      <div className="flex items-center text-[9px] uppercase tracking-[0.22em] text-muted-foreground/60 font-medium px-3 py-1.5 border-b border-border/20">
        <span className="w-[40%]">Price (₦)</span>
        <span className="w-[35%] text-right">Size</span>
        <span className="w-[25%] text-right">Total</span>
      </div>

      {isLoading ? (
        <>
          <Skeleton />
          <div className="h-px bg-border/30 mx-3" />
          <Skeleton />
        </>
      ) : !data || (data.asks.length === 0 && data.bids.length === 0) ? (
        <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
          No depth data available
        </div>
      ) : (
        <>
          {/* Asks — displayed in reverse (best ask at bottom, near spread) */}
          <div className="flex flex-col-reverse">
            {data.asks.map((level) => (
              <div
                key={level.priceKobo}
                onClick={() => onPriceClick?.(level.priceNaira)}
                className={onPriceClick ? 'cursor-pointer hover:brightness-110' : ''}
              >
                <Level
                  level={level}
                  maxTotal={maxAskTotal}
                  side="ask"
                  flash={flashedLevels.has(level.priceKobo)}
                />
              </div>
            ))}
          </div>

          {/* Spread */}
          <div className="relative flex items-center justify-center gap-3 py-2 px-3 bg-[#111822]/70 border-y border-border/30">
            <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
              <span className="text-[#f6465d] font-semibold">
                ₦{data.asks[0]?.priceNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 }) ?? '—'}
              </span>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-border/50 bg-muted/20 px-2.5 py-0.5">
              <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-medium">spread</span>
              <span className="text-[10px] font-mono font-semibold text-foreground">
                {data.spreadPct.toFixed(3)}%
              </span>
              <span className="text-[9px] text-muted-foreground font-mono">
                (₦{data.spreadNaira.toFixed(2)})
              </span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
              <span className="text-[#0ecb81] font-semibold">
                ₦{data.bids[0]?.priceNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 }) ?? '—'}
              </span>
            </div>
          </div>

          {/* Bids */}
          <div>
            {data.bids.map((level) => (
              <div
                key={level.priceKobo}
                onClick={() => onPriceClick?.(level.priceNaira)}
                className={onPriceClick ? 'cursor-pointer hover:brightness-110' : ''}
              >
                <Level
                  level={level}
                  maxTotal={maxBidTotal}
                  side="bid"
                  flash={flashedLevels.has(level.priceKobo)}
                />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-border/20 flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.18em]">
              Click a price to pre-fill order
            </span>
            <span className="text-[9px] text-muted-foreground/50 font-mono">
              mid ₦{data.midNaira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
