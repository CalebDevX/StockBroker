import AdminSidebar from './admin-sidebar'

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  return (
    <div className="flex bg-background min-h-screen">
      <AdminSidebar />
      <main className="flex-1 md:ml-64">
        <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

export function StatCard({
  label, value, sub, color = 'default',
}: {
  label: string; value: string | number; sub?: string; color?: 'default' | 'green' | 'amber' | 'red' | 'blue'
}) {
  const colorMap = {
    default: 'border-border',
    green:   'border-emerald-500/30 bg-emerald-500/5',
    amber:   'border-amber-500/30 bg-amber-500/5',
    red:     'border-red-500/30 bg-red-500/5',
    blue:    'border-primary/30 bg-primary/5',
  }
  const textMap = {
    default: 'text-foreground',
    green:   'text-emerald-400',
    amber:   'text-amber-400',
    red:     'text-red-400',
    blue:    'text-primary',
  }
  return (
    <div className={`bg-card border ${colorMap[color]} rounded-xl p-4`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${textMap[color]}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

export function Badge({ label, variant = 'default' }: { label: string; variant?: 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'default' }) {
  const map: Record<string, string> = {
    green:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    amber:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
    red:     'bg-red-500/15 text-red-400 border-red-500/30',
    blue:    'bg-primary/15 text-primary border-primary/30',
    gray:    'bg-secondary/30 text-muted-foreground border-border',
    default: 'bg-secondary/20 text-foreground border-border',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[variant] ?? map.default}`}>
      {label.toUpperCase()}
    </span>
  )
}

export function kycVariant(status: string): 'green' | 'amber' | 'red' | 'gray' {
  if (status === 'verified')     return 'green'
  if (status === 'under_review') return 'amber'
  if (status === 'rejected')     return 'red'
  return 'gray'
}

export function orderVariant(status: string): 'green' | 'blue' | 'amber' | 'red' | 'gray' {
  if (status === 'filled')    return 'green'
  if (status === 'submitted') return 'blue'
  if (status === 'partial')   return 'amber'
  if (status === 'rejected' || status === 'cancelled') return 'red'
  return 'gray'
}
