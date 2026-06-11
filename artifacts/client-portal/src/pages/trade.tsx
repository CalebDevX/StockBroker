import { useState } from 'react'
import { TrendingUp, TrendingDown, Activity, Zap, Search, BookOpen, LayoutList } from 'lucide-react'
import DashboardSidebar from '@/components/dashboard-sidebar'
import MarketTicker from '@/components/market-ticker'
import InstrumentSearch, { type SelectedInstrument } from '@/components/instrument-search'
import OrderForm from '@/components/order-form'
import OrderBookWidget from '@/components/order-book'
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

type MobileTab = 'search' | 'order' | 'book'

export default function TradePage() {
  const [selectedInstrument, setSelectedInstrument] = useState<SelectedInstrument | undefined>()
  const [mobileTab, setMobileTab] = useState<MobileTab>('search')
  const [prefillPrice, setPrefillPrice] = useState<number | undefined>()

  function handleSelect(instrument: SelectedInstrument) {
    setSelectedInstrument(instrument)
    setPrefillPrice(undefined)
    setMobileTab('order')
  }

  function handlePriceClick(price: number) {
    setPrefillPrice(price)
    setMobileTab('order')
  }

  return (
    <div className="bg-background min-h-screen overflow-x-hidden">
      <DashboardSidebar />

      <div className="md:pl-56 flex flex-col min-h-screen">
        <MarketTicker />

        {/* Page header */}
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

        {/* Mobile tab bar — 3 tabs */}
        <div className="md:hidden flex mx-4 mt-3 rounded-2xl border border-border/60 bg-[#0b0e11]/80 overflow-hidden">
          {([
            ['search', Search,     'Search'],
            ['order',  LayoutList, 'Order'],
            ['book',   BookOpen,   'Book'],
          ] as const).map(([tab, Icon, label]) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-all ${
                mobileTab === tab
                  ? 'bg-[#0ecb81]/15 text-[#0ecb81] border-b-2 border-[#0ecb81]'
                  : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {tab === 'order' && selectedInstrument && mobileTab !== 'order' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#0ecb81]" />
              )}
            </button>
          ))}
        </div>

        <main className="flex-1 p-3 md:p-5 pb-24 md:pb-6 space-y-3 mt-3 md:mt-0 max-w-[1400px] w-full mx-auto">
          {/* Instrument header (shown when selected) */}
          {selectedInstrument && <InstrumentHeader instrument={selectedInstrument} />}

          {/* Mobile: single-panel view toggled by tab */}
          <div className="md:hidden">
            {mobileTab === 'search' && (
              <div className="h-[calc(100dvh-260px)] min-h-[300px]">
                <InstrumentSearch
                  onSelect={handleSelect}
                  selectedSymbol={selectedInstrument?.symbol}
                />
              </div>
            )}
            {mobileTab === 'order' && (
              <div className="pb-4">
                {selectedInstrument ? (
                  <OrderForm
                    selectedSymbol={selectedInstrument.symbol}
                    selectedPrice={selectedInstrument.price}
                    prefillLimitPrice={prefillPrice}
                  />
                ) : (
                  <EmptyOrder />
                )}
              </div>
            )}
            {mobileTab === 'book' && (
              <div className="pb-4">
                {selectedInstrument ? (
                  <OrderBookWidget
                    symbol={selectedInstrument.symbol}
                    onPriceClick={handlePriceClick}
                  />
                ) : (
                  <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-border bg-[#0b0e11]/80 p-8 text-center text-muted-foreground">
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#0ecb81]/10 border border-[#0ecb81]/15">
                      <BookOpen className="w-7 h-7 text-[#0ecb81]" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-foreground mb-1">No stock selected</p>
                      <p className="text-sm">Search for a stock to see its order book.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop: 3-column layout */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-[2fr_3fr_2fr] gap-4">
            {/* Left: search */}
            <div className="h-[600px] lg:h-[700px]">
              <InstrumentSearch
                onSelect={setSelectedInstrument}
                selectedSymbol={selectedInstrument?.symbol}
              />
            </div>

            {/* Centre: order form */}
            <div className="flex flex-col gap-4">
              {selectedInstrument ? (
                <OrderForm
                  selectedSymbol={selectedInstrument.symbol}
                  selectedPrice={selectedInstrument.price}
                  prefillLimitPrice={prefillPrice}
                />
              ) : (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-[#0b0e11]/80 p-8 text-center text-muted-foreground">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0ecb81]/10 border border-[#0ecb81]/15">
                    <Activity className="w-7 h-7 text-[#0ecb81]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Select a stock to trade</p>
                    <p className="text-xs">Search for any NGX-listed instrument on the left to begin order entry.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: order book */}
            <div>
              {selectedInstrument ? (
                <OrderBookWidget
                  symbol={selectedInstrument.symbol}
                  onPriceClick={handlePriceClick}
                />
              ) : (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 rounded-2xl border border-border/40 bg-[#0b0e11]/60 p-8 text-center text-muted-foreground">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0ecb81]/8 border border-[#0ecb81]/10">
                    <BookOpen className="w-6 h-6 text-[#0ecb81]/50" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground/60 mb-1">Order book</p>
                    <p className="text-xs text-muted-foreground/60">Select a stock to see live depth.</p>
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
