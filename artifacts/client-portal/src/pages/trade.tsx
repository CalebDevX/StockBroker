import { useState } from 'react'
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react'
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
  const chg = quote?.changeNaira ?? 0
  const chgPct = quote?.changePct ?? 0
  const up = chgPct >= 0

  const hasNumber = (value: number | undefined) => typeof value === 'number'
  const stats = [
    { label: 'Prev close', value: hasNumber(quote?.prevCloseNaira) ? `₦${quote!.prevCloseNaira.toFixed(2)}` : '—' },
    { label: 'Change', value: hasNumber(quote?.changeNaira) ? `₦${quote!.changeNaira.toFixed(2)}` : '—' },
    { label: 'Change %', value: hasNumber(quote?.changePct) ? `${quote!.changePct.toFixed(2)}%` : '—' },
    { label: 'Volume', value: hasNumber(quote?.volume) ? quote!.volume.toLocaleString() : '—' },
    { label: 'Last price', value: hasNumber(quote?.lastPriceKobo) ? `₦${quote!.lastPriceNaira.toFixed(2)}` : '—' },
  ]

  return (
    <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-5 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)] backdrop-blur-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-base font-black text-foreground tracking-wide">{instrument.symbol}</span>
            <span className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-1 rounded-full uppercase tracking-[0.22em]">NGX</span>
          </div>
          <p className="text-sm text-muted-foreground truncate max-w-xl">{instrument.name}</p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-3xl font-bold text-foreground font-mono">₦{price.toFixed(2)}</span>
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${up ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-[#f6465d]/10 text-[#f6465d]'}`}>
            {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {up ? '+' : ''}{chgPct.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-3xl bg-[#111822]/80 border border-[#0ecb81]/10 p-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-medium">{s.label}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyTerminal() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-border bg-[#0b0e11]/80 p-8 text-center text-muted-foreground">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#0ecb81]/10 border border-[#0ecb81]/15">
        <Activity className="w-8 h-8 text-[#0ecb81]" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground mb-1">Select a stock to trade</p>
        <p className="text-sm">Search for any NGX-listed instrument on the left to begin order entry.</p>
      </div>
    </div>
  )
}

export default function TradePage() {
  const [selectedInstrument, setSelectedInstrument] = useState<SelectedInstrument | undefined>()

  return (
    <div className="flex bg-background min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        <MarketTicker />

        <main className="flex-1 p-4 md:p-5 pb-24 md:pb-5 space-y-4">
          <section className="rounded-[2rem] border border-[#0ecb81]/15 bg-gradient-to-br from-[#0b0e11] via-[#121820]/70 to-[#111821] p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.65)] backdrop-blur-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.32em] text-[#0ecb81]/80">Trade</span>
                  <KycStatusBadge />
                </div>
                <div>
                  <h1 className="mt-2 text-3xl font-bold text-foreground">One-click order entry</h1>
                  <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                    Power your NGX trading with fast order placement, live quotes, and full market context in one interface.
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-4 py-3 text-sm font-semibold text-[#0ecb81]">
                <Zap className="w-4 h-4" /> Market pulse
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.65)] backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">Trade confidence</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">Fast execution with premium order flow</h2>
              <p className="mt-3 text-sm text-muted-foreground">Use our NGX-optimized order panel to place market, limit, and stop orders with speed and precision.</p>
            </div>
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.65)] backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">Trade advice</p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                <p>Verify your order quantity before submission and use limit orders for price control.</p>
                <p>Keep an eye on market momentum when trading large blocks or after market announcements.</p>
              </div>
            </div>
          </section>

          {selectedInstrument && <InstrumentHeader instrument={selectedInstrument} />}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
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
                    <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">Order insights</p>
                    <h3 className="mt-3 text-lg font-semibold text-foreground">Quick trade checklist</h3>
                    <ul className="mt-4 space-y-3 text-sm text-muted-foreground list-disc list-inside">
                      <li>Confirm your order type matches your risk target.</li>
                      <li>Set a limit price when the market is volatile.</li>
                      <li>Monitor filled orders from the Orders page.</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="h-full">
                  <EmptyTerminal />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
