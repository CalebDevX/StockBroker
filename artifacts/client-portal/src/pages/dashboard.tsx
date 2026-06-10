import { Link } from 'wouter'
import { ArrowRight, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import DashboardSidebar from '@/components/dashboard-sidebar'
import MarketTicker from '@/components/market-ticker'
import StatsBar from '@/components/stats-bar'
import PortfolioChart from '@/components/portfolio-chart'
import HoldingsTable from '@/components/holdings-table'
import MarketMovers from '@/components/market-movers'
import KycBanner, { KycStatusBadge } from '@/components/kyc-banner'
import { portfolioApi, ordersApi, fmtKobo } from '@/lib/api'

export default function DashboardPage() {
  const { user } = useAuth()
  const greeting = user?.fullName ? `Welcome back, ${user.fullName.split(' ')[0]}` : 'Welcome back'

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: portfolioApi.summary,
    refetchInterval: 30_000,
  })

  const { data: ordersData } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.list,
    refetchInterval: 15_000,
  })

  const openOrders = ordersData?.orders.filter(o => ['pending', 'partial'].includes(o.status)).length ?? 0
  const pnlPct = summaryData?.pnlPercent ?? 0
  const gainLabel = summaryData ? `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%` : '—'

  const pnlDescription = summaryData == null
    ? 'Calculating unrealised gain/loss…'
    : pnlPct > 0
      ? `Up ${gainLabel} on open positions.`
      : pnlPct < 0
        ? `Down ${Math.abs(pnlPct).toFixed(2)}% on open positions.`
        : 'No unrealised gain or loss at present.'

  const ordersDescription = openOrders > 0
    ? `${openOrders} order${openOrders > 1 ? 's' : ''} pending execution.`
    : 'No open orders at this time.'

  return (
    <div className="flex bg-background min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        <MarketTicker />

        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 space-y-5">
          <section className="rounded-[2rem] border border-[#0ecb81]/15 bg-gradient-to-br from-[#0b0e11] via-[#121820]/70 to-[#111821] p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.65)] backdrop-blur-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <KycStatusBadge />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{greeting}</h1>
                  <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                    Real-time NGX execution, portfolio monitoring and account management.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Link href="/trade" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-4 py-3 text-sm font-semibold text-[#0ecb81] transition hover:bg-[#0ecb81]/15">
                  <TrendingUp className="w-4 h-4" /> Trade
                </Link>
                <Link href="/portfolio" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:border-[#0ecb81]/40 hover:bg-[#0ecb81]/5">
                  <Wallet className="w-4 h-4" /> Portfolio
                </Link>
                <Link href="/funds" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:border-[#0ecb81]/40 hover:bg-[#0ecb81]/5">
                  <ArrowRight className="w-4 h-4" /> Funds
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-5 shadow-[0_20px_40px_-30px_rgba(14,203,129,0.6)]">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/70">Portfolio value</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {summaryLoading ? 'Loading…' : summaryData ? fmtKobo(summaryData.totalPortfolioKobo) : '—'}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Total market value of equities and cash.</p>
            </div>
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-5 shadow-[0_20px_40px_-30px_rgba(14,203,129,0.6)]">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/70">Unrealised P&L</p>
              <p className={`mt-3 text-3xl font-semibold ${pnlPct >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                {summaryLoading ? 'Loading…' : gainLabel}
                {!summaryLoading && summaryData && (
                  pnlPct >= 0
                    ? <TrendingUp className="inline w-5 h-5 ml-2 opacity-70" />
                    : <TrendingDown className="inline w-5 h-5 ml-2 opacity-70" />
                )}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{pnlDescription}</p>
            </div>
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-5 shadow-[0_20px_40px_-30px_rgba(14,203,129,0.6)]">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/70">Open orders</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{ordersData ? openOrders : '—'}</p>
              <p className="mt-2 text-sm text-muted-foreground">{ordersDescription}</p>
            </div>
          </section>

          <KycBanner />
          <StatsBar />

          <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_0.8fr] gap-5">
            <div className="space-y-5">
              <PortfolioChart />
              <HoldingsTable />
            </div>
            <MarketMovers />
          </div>
        </main>
      </div>
    </div>
  )
}
