import { useQuery } from '@tanstack/react-query'
import { Link } from 'wouter'
import { ShieldAlert, TrendingUp, Users, Clock, AlertTriangle, ChevronRight } from 'lucide-react'
import AdminLayout, { StatCard, Badge, kycVariant, orderVariant } from '@/components/admin-layout'
import { adminApi, fmtKobo } from '@/lib/api'

export default function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => adminApi.metrics(),
    refetchInterval: 30_000,
  })

  const { data: kycData } = useQuery({
    queryKey: ['admin-kyc-queue'],
    queryFn:  () => adminApi.kycQueue(),
  })

  const { data: ordersData } = useQuery({
    queryKey: ['admin-orders-recent'],
    queryFn:  () => adminApi.orders({ limit: 8 }),
  })

  const m = data
  const c = m?.clients as Record<string, number> | undefined
  const o = m?.orders  as Record<string, number> | undefined
  const p = m?.portfolio as Record<string, number> | undefined

  return (
    <AdminLayout title="Overview" subtitle="Platform-wide metrics and recent activity">
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Clients" value={c?.total_clients ?? 0} color="default" />
            <StatCard label="KYC Verified"  value={c?.verified_clients ?? 0}
              sub={`${c?.pending_kyc ?? 0} pending · ${c?.under_review_kyc ?? 0} under review`} color="green" />
            <StatCard label="Suspended"     value={c?.suspended_clients ?? 0} color="red" />
            <StatCard label="Cash AUM"
              value={fmtKobo(Number(c?.total_cash_kobo ?? 0))}
              sub={`+ ${fmtKobo(Number(p?.total_portfolio_kobo ?? 0))} portfolio`} color="blue" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Orders Today"   value={o?.total_orders  ?? 0} color="default" />
            <StatCard label="Filled Today"   value={o?.filled_orders ?? 0} color="green" />
            <StatCard label="Active Orders"  value={o?.active_orders ?? 0} color="blue" />
            <StatCard label="Daily Volume"   value={fmtKobo(Number(o?.total_volume_kobo ?? 0))} color="default" />
          </div>

          {/* KYC Queue Alert */}
          {(kycData?.count ?? 0) > 0 && (
            <Link href="/admin/kyc">
              <div className="flex items-center gap-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 hover:bg-amber-500/15 transition-all cursor-pointer">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-300">
                    {kycData?.count} client{(kycData?.count ?? 0) > 1 ? 's' : ''} awaiting KYC review
                  </p>
                  <p className="text-xs text-muted-foreground">Click to review pending submissions</p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </div>
            </Link>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Recent Orders
                </h3>
                <Link href="/admin/orders" className="text-xs text-primary hover:underline">View all →</Link>
              </div>
              <div className="divide-y divide-border">
                {ordersData?.orders?.length === 0 && (
                  <p className="text-xs text-muted-foreground p-4">No orders yet</p>
                )}
                {ordersData?.orders?.map(o => (
                  <div key={o.orderId} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{o.symbol}</span>
                        <Badge label={o.side} variant={o.side === 'buy' ? 'green' : 'red'} />
                        <Badge label={o.status} variant={orderVariant(o.status)} />
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{o.clientName ?? o.clientId}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-foreground">{o.quantity.toLocaleString()} units</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(o.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* KYC Queue */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" /> KYC Queue
                </h3>
                <Link href="/admin/kyc" className="text-xs text-primary hover:underline">Review all →</Link>
              </div>
              <div className="divide-y divide-border">
                {(kycData?.count ?? 0) === 0 && (
                  <p className="text-xs text-muted-foreground p-4">No pending submissions</p>
                )}
                {kycData?.queue?.slice(0, 6).map(c => (
                  <div key={c.id} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary">
                        {c.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{c.fullName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.email}</p>
                    </div>
                    <Badge label={c.kycStatus} variant={kycVariant(c.kycStatus)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
