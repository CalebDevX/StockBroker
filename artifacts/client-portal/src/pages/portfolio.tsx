import { ChartLine, Layers, ShieldCheck, TrendingUp, TrendingDown } from 'lucide-react'
import { Link } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import DashboardSidebar from '@/components/dashboard-sidebar'
import PortfolioSummary from '@/components/portfolio-summary'
import PortfolioHoldingsTable from '@/components/portfolio-holdings-table'
import SectorAllocationChart from '@/components/sector-allocation-chart'
import TransactionHistory from '@/components/transaction-history'
import { KycStatusBadge } from '@/components/kyc-banner'
import { portfolioApi, fmtKobo, type Holding } from '@/lib/api'

function StatCard({
  label, value, sub, color, loading,
}: {
  label: string
  value: string
  sub: string
  color?: string
  loading?: boolean
}) {
  return (
    <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-5 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
      <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">{label}</p>
      {loading
        ? <div className="mt-3 h-8 w-28 rounded-xl bg-muted/40 animate-pulse" />
        : <p className={`mt-3 text-3xl font-semibold ${color ?? 'text-foreground'}`}>{value}</p>
      }
      <p className="mt-2 text-sm text-muted-foreground">{sub}</p>
    </div>
  )
}

export default function PortfolioPage() {
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: portfolioApi.summary,
    refetchInterval: 30_000,
  })

  const { data: holdingsData, isLoading: holdingsLoading } = useQuery({
    queryKey: ['portfolio-holdings'],
    queryFn: portfolioApi.holdings,
  })

  const { data: sectorData, isLoading: sectorLoading } = useQuery({
    queryKey: ['sector-allocation'],
    queryFn: portfolioApi.sectorAllocation,
  })

  const pnlPct   = summaryData?.pnlPercent ?? 0
  const pnlUp    = pnlPct >= 0
  const pnlLabel = summaryData
    ? `${pnlUp ? '+' : ''}${pnlPct.toFixed(2)}%`
    : '—'

  const topSector = sectorData?.sectors?.length
    ? [...sectorData.sectors].sort((a, b) => b.percentage - a.percentage)[0]?.sector ?? '—'
    : '—'

  const topHolding = holdingsData?.holdings?.length
    ? [...holdingsData.holdings].sort((a: Holding, b: Holding) => b.marketValueKobo - a.marketValueKobo)[0]?.symbol ?? '—'
    : '—'

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 md:ml-56 overflow-auto pb-24 md:pb-0">
        <div className="p-4 md:p-8">

          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-[#0ecb81]/80">Portfolio</p>
                <h1 className="mt-2 text-3xl md:text-4xl font-bold text-foreground">Wealth overview</h1>
                <p className="mt-2 text-sm text-muted-foreground hidden sm:block">
                  Live positions, sector allocation, and transaction history for your NGX account.
                </p>
              </div>
              <Link
                href="/trade"
                className="inline-flex items-center gap-2 rounded-2xl border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-4 py-3 text-sm font-semibold text-[#0ecb81] transition hover:bg-[#0ecb81]/15"
              >
                <ChartLine className="w-4 h-4" /> Place new trade
              </Link>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <StatCard
              label="Portfolio value"
              value={summaryData ? fmtKobo(summaryData.totalPortfolioKobo) : '—'}
              sub="Combined cash and equity holdings."
              loading={summaryLoading}
            />
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-5 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">Unrealised P&L</p>
              {summaryLoading
                ? <div className="mt-3 h-8 w-28 rounded-xl bg-muted/40 animate-pulse" />
                : (
                  <p className={`mt-3 text-3xl font-semibold flex items-center gap-2 ${pnlUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                    {pnlLabel}
                    {summaryData && (pnlUp
                      ? <TrendingUp className="w-5 h-5 opacity-70" />
                      : <TrendingDown className="w-5 h-5 opacity-70" />)}
                  </p>
                )}
              <p className="mt-2 text-sm text-muted-foreground">Return on open positions.</p>
            </div>
            <StatCard
              label="Top sector"
              value={sectorLoading ? '…' : topSector}
              sub={sectorData?.hasPositions ? 'Largest allocation by value.' : 'No positions yet.'}
              loading={false}
            />
          </div>

          {/* Main grid */}
          <section className="grid gap-4 md:grid-cols-[1.4fr_0.6fr] mb-8">
            <div className="space-y-4">
              <PortfolioSummary />
              <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)] backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">Allocation insight</p>
                    <h2 className="mt-2 text-xl font-semibold text-foreground">Portfolio composition</h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-3 py-1 text-xs font-semibold text-[#0ecb81]">
                    <Layers className="w-4 h-4" /> Diversified
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Balance across sectors to reduce concentration risk and capture broad NGX market growth.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-[#131a22] p-4 border border-[#0ecb81]/10">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Top holding</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {holdingsLoading ? '…' : topHolding}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-[#131a22] p-4 border border-[#0ecb81]/10">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Cash balance</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {summaryLoading ? '…' : summaryData ? fmtKobo(summaryData.cashBalanceKobo) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)] backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">Security</p>
                    <h2 className="mt-2 text-xl font-semibold text-foreground">Protected and insured</h2>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-[#0ecb81]" />
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Assets held at CSCS are safeguarded under Nigerian SEC regulations.
                </p>
                <div className="mt-6 rounded-3xl bg-[#111821] p-4 border border-[#0ecb81]/10 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Verification</p>
                    <div className="mt-2"><KycStatusBadge /></div>
                  </div>
                  <Link href="/kyc" className="rounded-full bg-[#0ecb81]/10 px-3 py-2 text-xs font-semibold text-[#0ecb81] hover:bg-[#0ecb81]/20 transition-colors">
                    View KYC
                  </Link>
                </div>
              </div>
              <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)] backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">Quick actions</p>
                <div className="mt-4 space-y-3">
                  <Link href="/funds" className="block rounded-2xl border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-4 py-3 text-sm font-semibold text-[#0ecb81] transition hover:bg-[#0ecb81]/15">
                    Add funds
                  </Link>
                  <Link href="/orders" className="block rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:border-[#0ecb81]/40 hover:bg-[#0ecb81]/5">
                    Review orders
                  </Link>
                  <Link href="/reports" className="block rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:border-[#0ecb81]/40 hover:bg-[#0ecb81]/5">
                    Download statement
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Holdings + Allocation + Activity */}
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
                <h2 className="text-xl font-semibold text-foreground">Holdings</h2>
                <p className="mt-2 text-sm text-muted-foreground">Live positions and market value across your portfolio.</p>
                <PortfolioHoldingsTable />
              </div>
              <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
                <h2 className="text-xl font-semibold text-foreground">Sector allocation</h2>
                <p className="mt-2 text-sm text-muted-foreground">Portfolio exposure by sector.</p>
                <SectorAllocationChart />
              </div>
            </div>
            <div>
              <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
                <h2 className="text-xl font-semibold text-foreground">Activity</h2>
                <p className="mt-2 text-sm text-muted-foreground">Recent cash flows and trade executions.</p>
                <TransactionHistory />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
