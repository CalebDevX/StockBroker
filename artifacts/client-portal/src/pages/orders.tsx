import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ClipboardList } from 'lucide-react'
import DashboardSidebar from '@/components/dashboard-sidebar'
import OrderBlotter from '@/components/order-blotter'
import { ordersApi, fmtKobo } from '@/lib/api'

export default function OrdersPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.list,
    refetchInterval: 15_000,
  })

  const orders = data?.orders ?? []
  const activeOrders = orders.filter(o => o.status === 'pending').length
  const filledOrders = orders.filter(o => o.status === 'filled' || o.status === 'partial').length
  const totalValue = orders.reduce((sum, o) => sum + (o.totalCostKobo ?? 0), 0)
  const fillRate = orders.length ? Math.round((filledOrders / orders.length) * 100) : 0

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage your stock orders</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {[
            {
              label: 'Active orders',
              value: isLoading ? '…' : String(activeOrders),
              hint: 'Waiting execution',
            },
            {
              label: 'Fill rate',
              value: isLoading ? '…' : `${fillRate}%`,
              hint: 'High execution success',
            },
            {
              label: 'Today’s volume',
              value: isLoading ? '…' : fmtKobo(totalValue),
              hint: 'Market liquidity',
            },
          ].map((card) => (
            <div key={card.label} className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-5 shadow-[0_20px_40px_-30px_rgba(14,203,129,0.6)]">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{card.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{card.hint}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-5 shadow-[0_20px_40px_-30px_rgba(14,203,129,0.6)] mb-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Order management</h2>
              <p className="mt-2 text-sm text-muted-foreground">Use filters and quick actions to keep orders aligned with your strategy.</p>
            </div>
            <button onClick={() => refetch()} className="rounded-2xl border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-4 py-2 text-sm font-semibold text-[#0ecb81] transition hover:bg-[#0ecb81]/15">
              Refresh orders
            </button>
          </div>
        </div>

        <OrderBlotter />
      </main>
    </div>
  )
}
