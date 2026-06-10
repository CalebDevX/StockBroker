import { useQuery } from '@tanstack/react-query'
import DashboardSidebar from '@/components/dashboard-sidebar'
import OrderBlotter from '@/components/order-blotter'
import { ordersApi, fmtKobo } from '@/lib/api'

export default function OrdersPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.list,
    refetchInterval: 15_000,
  })

  const orders        = data?.orders ?? []
  const activeOrders  = orders.filter(o => o.status === 'pending').length
  const filledOrders  = orders.filter(o => o.status === 'filled' || o.status === 'partial').length
  const totalValue    = orders.reduce((sum, o) => sum + (o.totalCostKobo ?? 0), 0)
  const fillRate      = orders.length ? Math.round((filledOrders / orders.length) * 100) : 0

  const fillRateHint =
    !orders.length    ? 'No orders placed yet.'
    : fillRate === 100 ? 'All orders filled.'
    : fillRate >= 80   ? 'Strong execution rate.'
    : fillRate >= 50   ? 'Partial fills in progress.'
    : 'Orders pending execution.'

  const volumeHint =
    totalValue === 0  ? 'No executed value yet.'
    : `Across ${filledOrders} filled order${filledOrders !== 1 ? 's' : ''}.`

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">

        {/* Header */}
        <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#0ecb81]/80">Orders</p>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold text-foreground">Order management</h1>
            <p className="mt-1 text-sm text-muted-foreground">Monitor, filter and cancel your NGX stock orders.</p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-4 py-2.5 text-sm font-semibold text-[#0ecb81] transition hover:bg-[#0ecb81]/15"
          >
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {[
            {
              label: 'Active orders',
              value: isLoading ? '…' : String(activeOrders),
              hint: activeOrders === 0 ? 'No pending orders.' : `${activeOrders} order${activeOrders !== 1 ? 's' : ''} awaiting execution.`,
            },
            {
              label: 'Fill rate',
              value: isLoading ? '…' : `${fillRate}%`,
              hint: fillRateHint,
            },
            {
              label: 'Total order value',
              value: isLoading ? '…' : fmtKobo(totalValue),
              hint: volumeHint,
            },
          ].map((card) => (
            <div key={card.label} className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-5 shadow-[0_20px_40px_-30px_rgba(14,203,129,0.6)]">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{card.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{card.hint}</p>
            </div>
          ))}
        </div>

        {/* Blotter */}
        <OrderBlotter />

      </main>
    </div>
  )
}
