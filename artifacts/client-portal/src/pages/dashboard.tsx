import { Link } from 'wouter'
import { TrendingUp, Wallet, ArrowRight, FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import DashboardSidebar from '@/components/dashboard-sidebar'
import MarketTicker from '@/components/market-ticker'
import StatsBar from '@/components/stats-bar'
import PortfolioChart from '@/components/portfolio-chart'
import HoldingsTable from '@/components/holdings-table'
import MarketMovers from '@/components/market-movers'
import KycBanner from '@/components/kyc-banner'
import { ordersApi } from '@/lib/api'
import { ModeBadge } from '@/components/dashboard-sidebar'

export default function DashboardPage() {
  const { user } = useAuth()
  const firstName = user?.fullName?.split(' ')[0] ?? 'there'

  const { data: ordersData } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.list,
    refetchInterval: 15_000,
  })

  const openOrders = ordersData?.orders.filter(
    o => ['pending', 'partial'].includes(o.status)
  ).length ?? 0

  return (
    <div className="flex bg-background min-h-screen">
      <DashboardSidebar />

      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        <MarketTicker />

        <main className="flex-1 p-3 md:p-4 pb-24 md:pb-4 space-y-3">

          {/* ── Compact header ── */}
          <div className="flex items-center justify-between gap-3 px-1 pt-1">
            <div className="flex items-center gap-3 min-w-0">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-foreground truncate">
                    Good {getTimeOfDay()}, {firstName}
                  </h1>
                  <ModeBadge compact />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                  NGX market {isMarketOpen() ? 'is open' : 'is closed'}
                  {openOrders > 0 && ` · ${openOrders} open order${openOrders > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            {/* Quick actions — desktop only */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <Link
                href="/trade"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#0ecb81]/25 bg-[#0ecb81]/10 px-3 py-1.5 text-xs font-semibold text-[#0ecb81] hover:bg-[#0ecb81]/15 transition"
              >
                <TrendingUp className="w-3.5 h-3.5" /> Trade
              </Link>
              <Link
                href="/funds"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-[#0ecb81]/30 transition"
              >
                <Wallet className="w-3.5 h-3.5" /> Funds
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-[#0ecb81]/30 transition"
              >
                <FileText className="w-3.5 h-3.5" /> Reports
              </Link>
            </div>
          </div>

          {/* ── Stats bar (all 4 key metrics in one compact row) ── */}
          <StatsBar />

          {/* ── KYC banner if unverified ── */}
          <KycBanner />

          {/* ── Main content grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
            {/* Left column */}
            <div className="space-y-3 min-w-0">
              <PortfolioChart />
              <HoldingsTable />
            </div>

            {/* Right column */}
            <div className="space-y-3">
              <MarketMovers />

              {/* Quick links card */}
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">Quick access</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Place an order',       href: '/trade',         icon: TrendingUp },
                    { label: 'View portfolio',        href: '/portfolio',     icon: Wallet     },
                    { label: 'Deposit / Withdraw',    href: '/funds',         icon: ArrowRight },
                    { label: 'Download statement',    href: '/reports',       icon: FileText   },
                  ].map(({ label, href, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-[#0ecb81]/5 hover:text-[#0ecb81] transition group"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#0ecb81] transition" />
                        {label}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-[#0ecb81]/60 transition" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function isMarketOpen() {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false
  const h = now.getHours()
  const m = now.getMinutes()
  const mins = h * 60 + m
  return mins >= 570 && mins < 1020 // 9:30–17:00 WAT
}
