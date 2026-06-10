import { Link, useLocation } from 'wouter'
import {
  LayoutDashboard, Users, ShieldCheck, ClipboardList,
  BarChart2, ScrollText, Settings, LogOut, ChevronLeft, Activity,
  ArrowLeftRight, MessageCircle, Terminal,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const ALL_NAV = [
  { label: 'Overview',    icon: LayoutDashboard, href: '/admin',             roles: ['admin']                      },
  { label: 'Clients',     icon: Users,           href: '/admin/clients',     roles: ['admin', 'broker', 'compliance'] },
  { label: 'KYC Queue',   icon: ShieldCheck,     href: '/admin/kyc',         roles: ['admin', 'compliance']        },
  { label: 'Orders',      icon: ClipboardList,   href: '/admin/orders',      roles: ['admin', 'broker']            },
  { label: 'Instruments', icon: BarChart2,        href: '/admin/instruments', roles: ['admin']                      },
  { label: 'Funds',       icon: ArrowLeftRight,  href: '/admin/funds',       roles: ['admin']                      },
  { label: 'Support',     icon: MessageCircle,   href: '/admin/support',     roles: ['admin']                      },
  { label: 'Audit Log',   icon: ScrollText,      href: '/admin/audit',       roles: ['admin']                      },
  { label: 'Settings',    icon: Settings,        href: '/admin/settings',    roles: ['admin']                      },
  { label: 'Developer',   icon: Terminal,        href: '/admin/developer',   roles: ['admin']                      },
  { label: 'System',      icon: Activity,        href: '/admin/system',      roles: ['admin']                      },
]

export default function AdminSidebar() {
  const [location] = useLocation()
  const { user, logout } = useAuth()

  const navItems = ALL_NAV.filter(item => item.roles.includes(user?.role ?? ''))

  function isActive(href: string) {
    if (href === '/admin') return location === '/admin'
    return location.startsWith(href)
  }

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex-col z-20">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-base font-bold text-foreground">Admin Panel</h1>
        </div>
        <p className="text-xs text-muted-foreground">StockBroker NG — {user?.role}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, icon: Icon, href }) => {
          const active = isActive(href)
          return (
            <Link key={label} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group text-sm ${
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-secondary/20 hover:text-foreground'
              }`}>
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <Link href="/dashboard"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary/20 hover:text-foreground transition-colors text-sm">
          <ChevronLeft className="w-4 h-4" />
          Client Portal
        </Link>
        <button onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-sm">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
