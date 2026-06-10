import { Link, useLocation } from 'wouter'
import { Home, TrendingUp, Briefcase, Bell, User } from 'lucide-react'

const ITEMS = [
  { label: 'Home',      icon: Home,       href: '/dashboard'     },
  { label: 'Portfolio', icon: Briefcase,  href: '/portfolio'     },
  { label: 'Trade',     icon: TrendingUp, href: '/trade', primary: true },
  { label: 'Alerts',   icon: Bell,       href: '/notifications' },
  { label: 'Account',  icon: User,       href: '/settings'      },
]

export default function MobileBottomNav() {
  const [location] = useLocation()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0e11]/95 backdrop-blur-md border-t border-[#0ecb81]/10"
      role="navigation"
      aria-label="Bottom navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex h-16">
        {ITEMS.map(({ label, icon: Icon, href, primary }) => {
          const active = location === href || location.startsWith(href + '/')
          if (primary) {
            return (
              <Link
                key={label}
                href={href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5"
              >
                <div className={`flex items-center justify-center w-12 h-10 rounded-2xl shadow-lg transition-all ${
                  active
                    ? 'bg-[#0ecb81] shadow-[#0ecb81]/40'
                    : 'bg-[#0ecb81]/90 shadow-[#0ecb81]/20'
                }`}>
                  <Icon className="w-5 h-5 text-[#0b0e11]" strokeWidth={2.5} />
                </div>
                <span className="text-[9px] font-semibold text-[#0ecb81]">{label}</span>
              </Link>
            )
          }
          return (
            <Link
              key={label}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                active ? 'text-[#0ecb81]' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-semibold">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
