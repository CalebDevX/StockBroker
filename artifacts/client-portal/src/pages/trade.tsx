import { useState } from 'react'
import { TrendingUp, TrendingDown, Activity, Zap, Search, BookOpen } from 'lucide-react'
import DashboardSidebar from '@/components/dashboard-sidebar'
import MarketTicker from '@/components/market-ticker'
import InstrumentSearch, { type SelectedInstrument } from '@/components/instrument-search'
import OrderForm from '@/components/order-form'
import { useQuery } from '@tanstack/react-query'
import { marketApi, type InstrumentQuote } from '@/lib/api'
import { KycStatusBadge } from '@/components/kyc-banner'

function InstrumentHeader({ instrument }: { instrument: SelectedInstrument }) {
  const { data: quote } = useQuery<InstrumentQuote>({
    queryKey: ['quote', instrument.symbol],
    queryFn: () => marketApi.quote(instrument.symbol),
    refetchInterval: 10_000,
    enabled: Boolean(instrument.symbol),
  })

  const price = quote?.lastPriceNaira ?? instrument.price
  const chgPct = quote?.changePct ?? 0
  const up = chgPct >= 0

  const hasNumber = (v: number | undefined) => typeof v === 'number'
  const stats = [
    { label: 'Prev close', value: hasNumber(quote?.prevCloseNaira) ? `₦${quote!.prevCloseNaira.toFixed(2)}` : '—' },
    { label: 'Change',     value: hasNumber(quote?.changeNaira)    ? `₦${quote!.changeNaira.toFixed(2)}` : '—' },
    { label: 'Change %',   value: hasNumber(quote?.changePct)      ? `${quote!.changePct.toFixed(2)}%` : '—' },
    { label: 'Volume',     value: hasNumber(quote?.volume)         ? quote!.volume.toLocaleString() : '—' },
    { label: 'Last price', value: hasNumber(quote?.lastPriceKobo)  ? `₦${quote!.lastPriceNaira.toFixed(2)}` : '—' },
  ]

  return (
    <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-4 md:p-5 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)] backdrop-blur-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-base font-black text-foreground tracking-wide">{instrument.symbol}</span>
            <span className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-1 rounded-full uppercase tracking-[0.22em]">NGX</span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{instrument.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-foreground font-mono">₦{price.toFixed(2)}</span>
          <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${up ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-[#f6465d]/10 text-[#f6465d]'}`}>
            {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {up ? '+' : ''}{chgPct.toFixed(2)}%
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-[#111822]/80 border border-[#0ecb81]/10 p-2.5">
            <p className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground font-medium">{s.label}</p>
            <p className="mt-1.5 text-xs font-semibold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyOrder() {
  return (
    <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-border bg-[#0b0e11]/80 p-8 text-center text-muted-foreground">
      <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#0ecb81]/10 border border-[#0ecb81]/15">
        <Activity className="w-7 h-7 text-[#0ecb81]" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground mb-1">No stock selected</p>
        <p className="text-sm">Search for a stock in the Search tab first.</p>
      </div>
    </div>
  )
}

type MobileTab = 'search' | 'order'

export default function TradePage() {
  const [selectedInstrument, setSelectedInstrument] = useState<SelectedInstrument | undefined>()
  const [mobileTab, setMobileTab] = useState<MobileTab>('search')

  function handleSelect(instrument: SelectedInstrument) {
    setSelectedInstrument(instrument)
    setMobileTab('order')
  }

  return (
    <div className="flex bg-background min-h-screen">
      <DashboardSidebar />

      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        <MarketTicker />

        {/* Page header — compact on mobile */}
        <div className="px-4 md:px-5 pt-4 pb-0 md:pt-5">
          <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-gradient-to-br from-[#0b0e11] via-[#121820]/70 to-[#111821] px-5 py-4 md:p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.65)] backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase tracking-[0.32em] text-[#0ecb81]/80">Trade</span>
                  <KycStatusBadge />
                </div>
                <h1 className="text-xl md:text-3xl font-bold text-foreground">Order entry</h1>
              </div>
              <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-4 py-3 text-sm font-semibold text-[#0ecb81]">
                <Zap className="w-4 h-4" /> Market pulse
              </div>
            </div>
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="md:hidden flex mx-4 mt-3 rounded-2xl border border-border/60 bg-[#0b0e11]/80 overflow-hidden">
          {([['search', Search, 'Search stocks'], ['order', BookOpen, 'Place order']] as const).map(([tab, Icon, label]) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
                mobileTab === tab
                  ? 'bg-[#0ecb81]/15 text-[#0ecb81] border-b-2 border-[#0ecb81]'
                  : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {tab === 'order' && selectedInstrument && mobileTab !== 'order' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#0ecb81] ml-0.5" />
              )}
            </button>
          ))}
        </div>

        <main className="flex-1 p-4 md:p-5 pb-24 md:pb-5 space-y-4 mt-3 md:mt-0">
          {/* Instrument header (shown when selected) */}
          {selectedInstrument && <InstrumentHeader instrument={selectedInstrument} />}

          {/* Mobile: single-panel view toggled by tab */}
          <div className="md:hidden">
            {mobileTab === 'search' && (
              <div className="h-[calc(100svh-260px)] min-h-[320px]">
                <InstrumentSearch
                  onSelect={handleSelect}
                  selectedSymbol={selectedInstrument?.symbol}
                />
              </div>
            )}
            {mobileTab === 'order' && (
              <div>
                {selectedInstrument
                  ? <OrderForm selectedSymbol={selectedInstrument.symbol} selectedPrice={selectedInstrument.price} />
                  : <EmptyOrder />
                }
              </div>
            )}
          </div>

          {/* Desktop: side-by-side */}
          <div className="hidden md:grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 h-[520px] lg:h-[640px]">
              <InstrumentSearch
                onSelect={setSelectedInstrument}
                selectedSymbol={selectedInstrument?.symbol}
              />
            </div>
            <div className="lg:col-span-3 flex flex-col gap-4">
              {selectedInstrument ? (
                <>
                  <OrderForm
                    selectedSymbol={selectedInstrument.symbol}
                    selectedPrice={selectedInstrument.price}
                  />
                  <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-5 shadow-[0_20px_40px_-30px_rgba(14,203,129,0.6)]">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">Quick checklist</p>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground list-disc list-inside">
                      <li>Confirm your order type matches your risk target.</li>
                      <li>Set a limit price when the market is volatile.</li>
                      <li>Monitor filled orders from the Orders page.</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-border bg-[#0b0e11]/80 p-8 text-center text-muted-foreground">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#0ecb81]/10 border border-[#0ecb81]/15">
                    <Activity className="w-8 h-8 text-[#0ecb81]" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground mb-1">Select a stock to trade</p>
                    <p className="text-sm">Search for any NGX-listed instrument on the left to begin order entry.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
