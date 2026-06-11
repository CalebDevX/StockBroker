import { Link, useLocation } from 'wouter'
import {
  LayoutDashboard, TrendingUp, ClipboardList, Briefcase, Wallet, LogOut,
  Radio, TestTube2, ShieldAlert, ShieldCheck, ChevronRight, Bell, LifeBuoy, FileText, Settings,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTradingMode } from '@/contexts/TradingModeContext'
import NotificationBell from '@/components/notification-bell'

const ADMIN_ROLES = ['admin', 'broker', 'compliance']

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Trade',     icon: TrendingUp,      href: '/trade'     },
  { label: 'Orders',   icon: ClipboardList,   href: '/orders'    },
  { label: 'Portfolio',icon: Briefcase,       href: '/portfolio' },
  { label: 'Funds',    icon: Wallet,          href: '/funds'     },
  { label: 'Reports',  icon: FileText,        href: '/reports'   },
  { label: 'Alerts',   icon: Bell,            href: '/notifications' },
  { label: 'Support',  icon: LifeBuoy,        href: '/help'      },
  { label: 'KYC',      icon: ShieldCheck,     href: '/kyc'       },
  { label: 'Settings', icon: Settings,        href: '/settings'  },
]

export function ModeBadge({ compact = false }: { compact?: boolean }) {
  const { mode, fixLoggedOn } = useTradingMode()
  if (mode === 'live') {
    return (
      <span className={`inline-flex items-center gap-1 rounded font-bold tracking-wide
        bg-[#f0b90b]/15 text-[#f0b90b] border border-[#f0b90b]/30
        ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
        <Radio className={`${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'} animate-pulse`} />
        LIVE{fixLoggedOn ? '' : ' ⚠'}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded font-bold tracking-wide
      bg-[#0ecb81]/15 text-[#0ecb81] border border-[#0ecb81]/30
      ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
      <TestTube2 className={`${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} />
      SIM
    </span>
  )
}

function MarketHours() {
  const now = new Date()
  const hour = now.getHours()
  const min = now.getMinutes()
  const dayOfWeek = now.getDay()
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
  const totalMins = hour * 60 + min
  const openMins  = 10 * 60       // 10:00 WAT
  const closeMins = 14 * 60 + 30  // 14:30 WAT

  const isOpen = isWeekday && totalMins >= openMins && totalMins < closeMins
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold tracking-wide ${
      isOpen ? 'bg-[#0ecb81]/10 text-[#0ecb81]' : 'bg-border/60 text-muted-foreground'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-[#0ecb81] animate-pulse' : 'bg-muted-foreground'}`} />
      {isOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
    </div>
  )
}

export default function DashboardSidebar() {
  const [location] = useLocation()
  const { user, logout } = useAuth()

  function isActive(href: string) {
    return location === href || location.startsWith(href + '/')
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'SB'

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-11 bg-[#0b0e11]/95 backdrop-blur-md border-b border-[#0ecb81]/10 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#0ecb81] flex items-center justify-center shrink-0">
            <span className="text-[#0b0e11] text-[8px] font-black tracking-tight">NGX</span>
          </div>
          <span className="text-sm font-bold text-foreground">StockBroker</span>
          <ModeBadge compact />
        </div>
        <NotificationBell />
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 bg-[#111821] border-r border-[#0ecb81]/10 flex-col z-20 shadow-[10px_0_60px_-48px_rgba(14,203,129,0.75)]">

        {/* Logo */}
        <div className="px-5 py-4 border-b border-[#0ecb81]/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-[#0ecb81] flex items-center justify-center shrink-0 shadow-lg shadow-[#0ecb81]/15">
                <span className="text-[#0b0e11] text-[11px] font-black tracking-tight">NGX</span>
              </div>
              <div className="leading-tight">
                <p className="text-sm font-bold text-foreground leading-none">StockBroker</p>
                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-[0.18em]">NGX Portal</p>
              </div>
            </div>
            <NotificationBell />
          </div>
          <MarketHours />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
            const active = isActive(href)
            return (
              <Link key={label} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all group relative ${
                  active
                    ? 'bg-[#0ecb81]/10 text-[#0ecb81]'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}>
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#0ecb81] rounded-r" />
                )}
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#0ecb81]' : 'text-muted-foreground group-hover:text-foreground'}`} />
                <span className="text-[13px] font-medium">{label}</span>
                {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 border-t border-border pt-3 space-y-0.5">
          {user && ADMIN_ROLES.includes(user.role) && (
            <Link href="/admin"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-[#f0b90b] hover:bg-[#f0b90b]/10 transition-colors group">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-[13px] font-medium">Admin Panel</span>
            </Link>
          )}
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-muted-foreground hover:bg-[#f6465d]/10 hover:text-[#f6465d] transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="text-[13px] font-medium">Sign Out</span>
          </button>

          {user && (
            <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-border px-1">
              <div className="w-7 h-7 rounded-full bg-[#0ecb81]/20 border border-[#0ecb81]/40 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-[#0ecb81]">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate leading-tight">{user.fullName}</p>
                <p className="text-[9px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

    </>
  )
}
