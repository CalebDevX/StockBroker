import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'
import { ArrowRight, Clock } from 'lucide-react'
import { ordersApi, type Order } from '@/lib/api'

const STATUS_STYLES: Record<string, string> = {
  filled:    'bg-[#0ecb81]/10 text-[#0ecb81]',
  partial:   'bg-[#f0b90b]/10 text-[#f0b90b]',
  pending:   'bg-[#f0b90b]/10 text-[#f0b90b]',
  cancelled: 'bg-muted/40 text-muted-foreground',
  rejected:  'bg-[#f6465d]/10 text-[#f6465d]',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function ActivityRow({ order }: { order: Order }) {
  const [, nav] = useLocation()
  const isBuy  = order.side === 'buy'
  const label  = order.status.charAt(0).toUpperCase() + order.status.slice(1)
  const style  = STATUS_STYLES[order.status] ?? 'bg-muted/40 text-muted-foreground'

  return (
    <button
      onClick={() => nav('/orders')}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition text-left group"
    >
      {/* Side dot */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black ${
        isBuy ? 'bg-[#0ecb81]/15 text-[#0ecb81]' : 'bg-[#f6465d]/15 text-[#f6465d]'
      }`}>
        {isBuy ? 'B' : 'S'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-bold text-foreground tracking-wide">{order.symbol}</span>
          <span className="text-[10px] text-muted-foreground">{order.quantity.toLocaleString()} shares</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <Clock className="w-2.5 h-2.5 text-muted-foreground/60" />
          <span className="text-[10px] text-muted-foreground">{timeAgo(order.createdAt)}</span>
        </div>
      </div>

      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${style}`}>
        {label}
      </span>
    </button>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="w-6 h-6 rounded-full bg-border/40 animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 w-24 bg-border/50 rounded animate-pulse" />
        <div className="h-2 w-16 bg-border/30 rounded animate-pulse" />
      </div>
      <div className="h-4 w-14 bg-border/40 rounded-full animate-pulse" />
    </div>
  )
}

export default function RecentActivity() {
  const [, nav] = useLocation()
  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.list,
    refetchInterval: 15_000,
  })

  const recent = (data?.orders ?? []).slice(0, 5)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
          Recent Orders
        </p>
        <button
          onClick={() => nav('/orders')}
          className="text-[10px] text-muted-foreground hover:text-[#0ecb81] transition flex items-center gap-1"
        >
          All orders <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
      ) : recent.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">No orders yet</p>
      ) : (
        recent.map(o => <ActivityRow key={o.id} order={o} />)
      )}
    </div>
  )
}
