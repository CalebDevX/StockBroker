import { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, AlertCircle, Radio, TestTube2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { ordersApi } from '@/lib/api'
import { useTradingMode } from '@/contexts/TradingModeContext'

interface OrderFormProps {
  selectedSymbol?: string
  selectedPrice?: number
}

const inp = 'w-full px-3 py-2.5 bg-[#1e2329] border border-border rounded text-sm text-foreground font-mono placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#0ecb81] focus:border-[#0ecb81] transition-all'

const ORDER_VALIDITY = [
  { value: 'day', label: 'Day', description: 'Order expires at close of the trading session.' },
  { value: 'gtc', label: 'GTC', description: 'Good till cancelled — stays active until filled or cancelled.' },
  { value: 'ioc', label: 'IOC', description: 'Immediate or cancel — fill available quantity instantly.' },
  { value: 'fok', label: 'FOK', description: 'Fill or kill — execute fully immediately or cancel.' },
] as const

export default function OrderForm({ selectedSymbol, selectedPrice }: OrderFormProps) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [priceType, setPriceType] = useState<'market' | 'limit'>('market')
  const [validity, setValidity] = useState<(typeof ORDER_VALIDITY)[number]['value']>('day')
  const [quantity, setQuantity] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [showFees, setShowFees] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [liveConfirmed, setLiveConfirmed] = useState(false)
  const qc = useQueryClient()
  const { mode, fixLoggedOn } = useTradingMode()
  const isLive = mode === 'live'

  const qty = parseInt(quantity) || 0
  const priceNaira = priceType === 'market' ? (selectedPrice || 0) : (parseFloat(limitPrice) || 0)
  const grossValue = qty * priceNaira

  const brokerage = grossValue * 0.0075
  const vat       = brokerage * 0.075
  const secLevy   = grossValue * 0.003
  const nseCharge = grossValue * 0.003
  const cscs      = grossValue * 0.001

  const totalCost = useMemo(() =>
    grossValue + brokerage + vat + secLevy + nseCharge + cscs,
    [grossValue, brokerage, vat, secLevy, nseCharge, cscs]
  )

  const mutation = useMutation({
    mutationFn: () => ordersApi.place({
      symbol: selectedSymbol!,
      side,
      orderType: priceType,
      quantity: qty,
      validity,
      ...(priceType === 'limit' ? { limitPriceNaira: parseFloat(limitPrice) } : {}),
    }),
    onSuccess: (data) => {
      const ord = data.order
      setFeedback({
        ok: true,
        msg: isLive
          ? `Order sent to NGX ATS — Ref: ${ord.id.slice(0, 8).toUpperCase()}`
          : `Order submitted — ${side.toUpperCase()} ${qty} ${ord.symbol} — filling shortly`,
      })
      setQuantity('')
      setLimitPrice('')
      setLiveConfirmed(false)
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['portfolio-summary'] })
      setTimeout(() => setFeedback(null), 8000)
    },
    onError: (err) => {
      setFeedback({ ok: false, msg: (err as Error).message })
      setTimeout(() => setFeedback(null), 8000)
    },
  })

  const canPlace = !!selectedSymbol && qty > 0
    && (priceType === 'market' || parseFloat(limitPrice) > 0)
    && (!isLive || liveConfirmed)

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-foreground">
            {selectedSymbol ? `${selectedSymbol} — Place Order` : 'Place Order'}
          </p>
          {selectedPrice && selectedPrice > 0 && (
            <span className="text-[10px] text-muted-foreground font-mono bg-muted/40 px-1.5 py-0.5 rounded">
              Last ₦{selectedPrice.toFixed(2)}
            </span>
          )}
        </div>
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold bg-[#f0b90b]/15 text-[#f0b90b] border border-[#f0b90b]/30">
            <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold bg-[#0ecb81]/15 text-[#0ecb81] border border-[#0ecb81]/30">
            <TestTube2 className="w-2.5 h-2.5" /> SIM
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Live warning */}
        {isLive && (
          <div className="flex items-start gap-2.5 bg-[#f0b90b]/10 border border-[#f0b90b]/25 rounded p-3">
            <AlertTriangle className="w-3.5 h-3.5 text-[#f0b90b] shrink-0 mt-0.5" />
            <div>
              <p className="text-[#f0b90b] text-[11px] font-bold mb-0.5">Live Trading — Real Money</p>
              <p className="text-muted-foreground text-[10px] leading-relaxed">
                Orders are routed to the NGX Automated Trading System via FIX 4.4.
                {!fixLoggedOn && <span className="text-[#f6465d] font-semibold"> FIX session disconnected.</span>}
              </p>
            </div>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className={`flex items-center gap-2 rounded p-3 border text-sm ${
            feedback.ok
              ? 'bg-[#0ecb81]/10 border-[#0ecb81]/30 text-[#0ecb81]'
              : 'bg-[#f6465d]/10 border-[#f6465d]/30 text-[#f6465d]'
          }`}>
            {feedback.ok
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />}
            <p className="text-xs">{feedback.msg}</p>
          </div>
        )}

        {/* Buy / Sell toggle */}
        <div className="flex rounded overflow-hidden border border-border">
          <button onClick={() => setSide('buy')}
            className={`flex-1 py-2.5 text-sm font-bold transition-all ${
              side === 'buy'
                ? 'bg-[#0ecb81] text-[#0b0e11]'
                : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`}>
            BUY
          </button>
          <button onClick={() => setSide('sell')}
            className={`flex-1 py-2.5 text-sm font-bold transition-all border-l border-border ${
              side === 'sell'
                ? 'bg-[#f6465d] text-white'
                : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`}>
            SELL
          </button>
        </div>

        {/* Order type */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Order Type</label>
          <div className="flex gap-1.5">
            {(['market', 'limit'] as const).map(t => (
              <button key={t} onClick={() => setPriceType(t)}
                className={`flex-1 py-2 rounded text-xs font-semibold capitalize transition-all ${
                  priceType === t
                    ? 'bg-[#0ecb81]/20 text-[#0ecb81] border border-[#0ecb81]/40'
                    : 'bg-[#1e2329] text-muted-foreground border border-border hover:border-muted'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Time in force</label>
          <div className="flex flex-wrap gap-1.5">
            {ORDER_VALIDITY.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setValidity(option.value)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  validity === option.value
                    ? 'bg-[#0ecb81]/20 text-[#0ecb81] border border-[#0ecb81]/40'
                    : 'bg-[#1e2329] text-muted-foreground border border-border hover:border-muted'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{ORDER_VALIDITY.find((o) => o.value === validity)?.description}</p>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Quantity (shares)</label>
          <input
            type="number" min="1"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="0"
            className={inp}
          />
        </div>

        {/* Limit price */}
        {priceType === 'limit' && (
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Limit Price (₦)</label>
            <input
              type="number" step="0.01" min="0.01"
              value={limitPrice}
              onChange={e => setLimitPrice(e.target.value)}
              placeholder="0.00"
              className={inp}
            />
          </div>
        )}

        {/* Order summary strip */}
        {grossValue > 0 && (
          <div className="bg-[#1e2329] rounded border border-border p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Gross Value</span>
              <span className="font-mono font-semibold text-foreground">₦{grossValue.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Expandable fees */}
            <button
              onClick={() => setShowFees(v => !v)}
              className="w-full flex items-center justify-between text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Transaction charges</span>
              <div className="flex items-center gap-1">
                <span className="font-mono">₦{(brokerage + vat + secLevy + nseCharge + cscs).toFixed(2)}</span>
                {showFees ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>
            </button>

            {showFees && (
              <div className="space-y-1.5 pt-1 border-t border-border">
                {[
                  { label: 'Brokerage (0.75%)', value: brokerage },
                  { label: 'VAT (7.5%)',         value: vat       },
                  { label: 'SEC Levy (0.3%)',     value: secLevy  },
                  { label: 'NGX Charge (0.3%)',   value: nseCharge},
                  { label: 'CSCS (0.1%)',         value: cscs     },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono text-muted-foreground">₦{value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-2 border-t border-border text-sm font-bold">
              <span className="text-foreground">{side === 'buy' ? 'Total Cost' : 'Net Proceeds'}</span>
              <span className={side === 'buy' ? 'text-[#0ecb81] font-mono' : 'text-[#f6465d] font-mono'}>
                ₦{totalCost.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* Live confirmation */}
        {isLive && grossValue > 0 && (
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={liveConfirmed}
              onChange={e => setLiveConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#f0b90b]"
            />
            <span className="text-[10px] text-[#f0b90b] leading-relaxed">
              I confirm this is a <strong>real order</strong> for ₦{totalCost.toFixed(2)} on the NGX. This cannot be undone once matched.
            </span>
          </label>
        )}

        {/* Submit */}
        <button
          onClick={() => mutation.mutate()}
          disabled={!canPlace || mutation.isPending}
          className={`w-full py-3 text-sm font-bold rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            side === 'buy'
              ? isLive ? 'bg-[#f0b90b] hover:bg-[#f0b90b]/90 text-[#0b0e11]' : 'bg-[#0ecb81] hover:bg-[#0ecb81]/90 text-[#0b0e11]'
              : 'bg-[#f6465d] hover:bg-[#f6465d]/90 text-white'
          }`}
        >
          {mutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-current/40 border-t-current rounded-full animate-spin" />
              {isLive ? 'Sending to NGX…' : 'Processing…'}
            </span>
          ) : (
            `${side === 'buy' ? 'BUY' : 'SELL'} ${selectedSymbol || '—'}${
              qty > 0 ? ` × ${qty.toLocaleString()}` : ''
            }${isLive ? ' [LIVE]' : ''}`
          )}
        </button>

        {!isLive && (
          <p className="text-center text-[10px] text-muted-foreground -mt-1">
            Simulation mode · Orders execute against live NGX prices
          </p>
        )}
      </div>
    </div>
  )
}
