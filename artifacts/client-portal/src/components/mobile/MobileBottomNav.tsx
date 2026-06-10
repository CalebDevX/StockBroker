import React from 'react'
import { Link } from 'wouter'
import { Home, BarChart2, Layers, List, Bell, MoreHorizontal } from 'lucide-react'
import useMobileNav from './useMobileNav'

const NavItem = ({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) => (
  <Link href={to} className="flex-1 w-full flex flex-col items-center justify-center py-2 text-xs text-muted-foreground">
    <div className="h-6 w-6">{icon}</div>
    <span className="mt-1">{label}</span>
  </Link>
)

export default function MobileBottomNav() {
  const { openMore, setOpenMore } = useMobileNav()

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur border-t z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between">
          <NavItem to="/dashboard" label="Home" icon={<Home />} />
          <NavItem to="/portfolio" label="Portfolio" icon={<BarChart2 />} />
          <NavItem to="/orders" label="Orders" icon={<List />} />
          <NavItem to="/notifications" label="Alerts" icon={<Bell />} />
          <button
            aria-label="More"
            aria-controls="more-drawer"
            aria-expanded={openMore}
            onClick={() => setOpenMore(!openMore)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setOpenMore(!openMore)
              }
            }}
            className="flex-1 flex flex-col items-center justify-center py-2 text-xs text-muted-foreground"
          >
            <div className="h-6 w-6"><MoreHorizontal /></div>
            <span className="mt-1">More</span>
          </button>
        </div>
      </div>
    </div>
  )
}
