import { useState } from 'react'
import { Link } from 'wouter'
import { TrendingUp, Wallet, ArrowRight, FileText, Monitor, PieChart, Activity } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import DashboardSidebar from '@/components/dashboard-sidebar'
import MarketTicker from '@/components/market-ticker'
import StatsBar from '@/components/stats-bar'
import MarketSummary from '@/components/market-summary'
import RecentActivity from '@/components/recent-activity'
import PortfolioChart from '@/components/portfolio-chart'
import HoldingsTable from '@/components/holdings-table'
import MarketMovers from '@/components/market-movers'
import KycBanner from '@/components/kyc-banner'
import CommandCentreLayout from '@/components/dashboard-layouts/CommandCentreLayout'
import WealthOverviewLayout from '@/components/dashboard-layouts/WealthOverviewLayout'
import ActivityFeedLayout from '@/components/dashboard-layouts/ActivityFeedLayout'
import { ordersApi } from '@/lib/api'
import { ModeBadge } from '@/components/dashboard-sidebar'

type LayoutMode = 'standard' | 'command' | 'wealth' | 'feed'

const LAYOUT_OPTIONS: { id: LayoutMode; label: string; icon: React.ElementType; title: string }[] = [
  { id: 'command', label: 'Command',  icon: Monitor,  title: 'Command Centre — dense trading terminal'  },
  { id: 'wealth',  label: 'Wealth',   icon: PieChart,  title: 'Wealth Overview — premium wealth view'   },
  { id: 'feed',    label: 'Feed',     icon: Activity,  title: 'Activity Feed — recent events & trades'  },
  { id: 'standard',label: 'Classic',  icon: Wallet,    title: 'Classic — original dashboard layout'     },
]

function useDashboardLayout() {
  const [layout, setLayout] = useState<LayoutMode>(() => {
    const saved = localStorage.getItem('ngx-dashboard-layout') as LayoutMode | null
    return saved ?? 'command'
  })
  const update = (l: LayoutMode) => {
    localStorage.setItem('ngx-dashboard-layout', l)
    setLayout(l)
  }
  return [layout, update] as const
}

export default function DashboardPage() {
  const { user } = useAuth()
  const firstName = user?.fullName?.split(' ')[0] ?? 'there'
  const [layout, setLayout] = useDashboardLayout()

  const { data: ordersData } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.list,
    refetchInterval: 15_000,
  })

  const openOrders = ordersData?.orders.filter(
    o => ['pending', 'partial'].includes(o.status),
  ).length ?? 0

  return (
    <div className="bg-background min-h-screen overflow-x-hidden">
      <DashboardSidebar />

      <div className="md:pl-56 flex flex-col min-h-screen pt-11 md:pt-0">
        <MarketTicker />

        <main className="flex-1 p-3 md:p-5 pb-24 md:pb-6 space-y-3 max-w-[1400px] w-full mx-auto">

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

            <div className="flex items-center gap-2 shrink-0">
              {/* Layout switcher */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-border bg-card">
                {LAYOUT_OPTIONS.map(({ id, icon: Icon, title }) => (
                  <button
                    key={id}
                    title={title}
                    onClick={() => setLayout(id)}
                    className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
                      layout === id
                        ? 'bg-[#0ecb81] text-[#0b0e11] shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>

              {/* Quick actions — desktop only */}
              <div className="hidden md:flex items-center gap-2">
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
          </div>

          {/* ── KYC banner (always visible) ── */}
          <KycBanner />

          {/* ── Layout variants ── */}
          {layout === 'command' && <CommandCentreLayout />}
          {layout === 'wealth'  && <WealthOverviewLayout />}
          {layout === 'feed'    && <ActivityFeedLayout />}

          {/* ── Classic / Standard layout ── */}
          {layout === 'standard' && (
            <>
              <StatsBar />
              <MarketSummary />

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">
                <div className="space-y-3 min-w-0">
                  <PortfolioChart />
                  <HoldingsTable />
                </div>
                <div className="space-y-3">
                  <MarketMovers />
                  <RecentActivity />

                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-2 px-1">
                      Quick access
                    </p>
                    <div className="space-y-0.5">
                      {[
                        { label: 'Place an order',      href: '/trade',     icon: TrendingUp },
                        { label: 'View portfolio',      href: '/portfolio', icon: Wallet     },
                        { label: 'Deposit / Withdraw',  href: '/funds',     icon: ArrowRight },
                        { label: 'Statement',           href: '/reports',   icon: FileText   },
                      ].map(({ label, href, icon: Icon }) => (
                        <Link
                          key={href}
                          href={href}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-xs text-foreground hover:bg-[#0ecb81]/5 hover:text-[#0ecb81] transition group"
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
            </>
          )}

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
  const day = now.getDay()
  if (day === 0 || day === 6) return false
  const mins = now.getHours() * 60 + now.getMinutes()
  return mins >= 570 && mins < 1020
}
