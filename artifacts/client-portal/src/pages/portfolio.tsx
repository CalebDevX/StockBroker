import { ChartLine, Layers, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'wouter'
import DashboardSidebar from '@/components/dashboard-sidebar'
import PortfolioSummary from '@/components/portfolio-summary'
import PortfolioHoldingsTable from '@/components/portfolio-holdings-table'
import SectorAllocationChart from '@/components/sector-allocation-chart'
import TransactionHistory from '@/components/transaction-history'
import { KycStatusBadge } from '@/components/kyc-banner'

export default function PortfolioPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 md:ml-56 overflow-auto pb-24 md:pb-0">
        <div className="p-4 md:p-8">
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-[#0ecb81]/80">Portfolio</p>
                <h1 className="mt-2 text-3xl md:text-4xl font-bold text-foreground">Real-time wealth overview</h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Track your assets, monitor allocation, and review your trading activity with confidence.
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

          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-5 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">Portfolio value</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">₦12.8M</p>
              <p className="mt-2 text-sm text-muted-foreground">Combined cash and equity holdings.</p>
            </div>
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-5 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">YTD performance</p>
              <p className="mt-3 text-3xl font-semibold text-[#0ecb81]">+18.4%</p>
              <p className="mt-2 text-sm text-muted-foreground">Returns since the start of the year.</p>
            </div>
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-5 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">Top sector</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">Financials</p>
              <p className="mt-2 text-sm text-muted-foreground">Strong exposure to high-growth NGX leaders.</p>
            </div>
          </div>

          <section className="grid gap-4 md:grid-cols-[1.4fr_0.6fr] mb-8">
            <div className="space-y-4">
              <PortfolioSummary />
              <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)] backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">Insight</p>
                    <h2 className="mt-2 text-xl font-semibold text-foreground">Allocation advantage</h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-3 py-1 text-xs font-semibold text-[#0ecb81]">
                    <Layers className="w-4 h-4" /> Diversified
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Keep your portfolio balanced across sectors and reduce risk with an allocation profile built for long-term growth.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-[#131a22] p-4 border border-[#0ecb81]/10">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Top holding</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">MTN Nigeria</p>
                  </div>
                  <div className="rounded-3xl bg-[#131a22] p-4 border border-[#0ecb81]/10">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Liquidity</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">₦1.2M</p>
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
                  Your assets are safeguarded by our secure platform and strict trading controls.
                </p>
                <div className="mt-6 rounded-3xl bg-[#111821] p-4 border border-[#0ecb81]/10 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Verification</p>
                    <p className="mt-2 text-base font-semibold text-foreground"><KycStatusBadge /></p>
                  </div>
                  <Link href="/kyc" className="rounded-full bg-[#0ecb81]/10 px-3 py-2 text-xs font-semibold text-[#0ecb81] hover:bg-[#0ecb81]/20 transition-colors">
                    Update KYC
                  </Link>
                </div>
              </div>
              <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)] backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">Quick action</p>
                <div className="mt-4 space-y-3">
                  <Link href="/funds" className="block rounded-2xl border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-4 py-3 text-sm font-semibold text-[#0ecb81] transition hover:bg-[#0ecb81]/15">
                    Add funds
                  </Link>
                  <Link href="/orders" className="block rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:border-[#0ecb81]/40 hover:bg-[#0ecb81]/5">
                    Review order history
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
                <h2 className="text-xl font-semibold text-foreground">Holdings</h2>
                <p className="mt-2 text-sm text-muted-foreground">Detailed positions and market value for your portfolio.</p>
                <PortfolioHoldingsTable />
              </div>
              <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
                <h2 className="text-xl font-semibold text-foreground">Allocation</h2>
                <p className="mt-2 text-sm text-muted-foreground">Portfolio exposure by sector and instruments.</p>
                <SectorAllocationChart />
              </div>
            </div>
            <div className="space-y-6">
              <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Activity</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Latest movements and cash flow in your book.</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#0ecb81]/10 px-2.5 py-1 text-xs font-semibold text-[#0ecb81]">
                    <Sparkles className="w-3.5 h-3.5" /> Fast update
                  </span>
                </div>
                <TransactionHistory />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
