import { useState } from 'react'
import { useLocation } from 'wouter'
import { ChevronLeft, ChevronRight, X, Clock, CheckCircle2, XCircle, AlertCircle, List, Loader2, RefreshCw, ArrowRight, Receipt } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi, type Order } from '@/lib/api'
import { useOrderStream } from '@/hooks/useOrderStream'

type StatusFilter = 'All' | 'pending' | 'filled' | 'cancelled' | 'rejected' | 'partial'

const STATUS_META: Record<StatusFilter, { label: string; icon: React.ElementType; badge: string }> = {
  All:       { label: 'All',       icon: List,         badge: 'bg-border/60 text-foreground'          },
  pending:   { label: 'Pending',   icon: Clock,        badge: 'bg-yellow-500/15 text-yellow-300'       },
  filled:    { label: 'Filled',    icon: CheckCircle2, badge: 'bg-emerald-500/15 text-emerald-400'     },
  partial:   { label: 'Partial',   icon: CheckCircle2, badge: 'bg-sky-500/15 text-sky-400'             },
  cancelled: { label: 'Cancelled', icon: XCircle,      badge: 'bg-slate-500/15 text-slate-400'         },
  rejected:  { label: 'Rejected',  icon: AlertCircle,  badge: 'bg-red-500/15 text-red-400'             },
}

const STATUS_ROW: Record<string, string> = {
  pending:   'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20',
  filled:    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  partial:   'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  cancelled: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  rejected:  'bg-red-500/10 text-red-400 border border-red-500/20',
}

const SIDE_CLS: Record<string, string> = {
  buy:  'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  sell: 'bg-red-500/15 text-red-400 border border-red-500/25',
}

const VALIDITY_CLS = 'bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded font-mono'
const ITEMS_PER_PAGE = 8
const STATUS_TABS: StatusFilter[] = ['All', 'pending', 'filled', 'partial', 'cancelled', 'rejected']

function fmt(n: number | null) {
  if (!n) return '—'
  return '₦' + (n / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtPrice(n: number | null) {
  if (!n) return '—'
  return '₦' + (n / 100).toFixed(2)
}
function fmtTime(s: string) {
  return new Date(s).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function OrderBlotter() {
  useOrderStream()
  const qc = useQueryClient()
  const [, navigate] = useLocation()
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('All')
  const [currentPage, setCurrentPage] = useState(1)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.list,
    refetchInterval: 15_000,
  })
  const orders = data?.orders ?? []

  const cancelMutation = useMutation({
    mutationFn: (id: string) => ordersApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['portfolio-summary'] })
    },
  })

  const counts: Record<StatusFilter, number> = {
    All:       orders.length,
    pending:   orders.filter(o => o.status === 'pending').length,
    filled:    orders.filter(o => o.status === 'filled').length,
    partial:   orders.filter(o => o.status === 'partial').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    rejected:  orders.filter(o => o.status === 'rejected').length,
  }

  const filteredOrders = filterStatus === 'All' ? orders : orders.filter(o => o.status === filterStatus)
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedOrders = filteredOrders.slice(startIdx, startIdx + ITEMS_PER_PAGE)
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  function goTo(page: number) {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)))
  }

  if (isLoading) return (
    <div className="bg-card border border-border rounded-xl flex items-center justify-center py-20 gap-2 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>Loading orders…</span>
    </div>
  )

  if (isError) return (
    <div className="bg-card border border-border rounded-xl py-20 text-center">
      <p className="text-muted-foreground mb-4">Failed to load orders</p>
      <button onClick={() => refetch()} className="text-primary text-sm flex items-center gap-2 mx-auto hover:underline">
        <RefreshCw className="w-4 h-4" /> Retry
      </button>
    </div>
  )

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 className="text-base font-bold text-foreground">Order Blotter</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-border/30" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-muted-foreground bg-border/30 px-3 py-1 rounded-full border border-border">
            {counts.All} order{counts.All !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex gap-1.5 px-4 pt-3 pb-2 overflow-x-auto border-b border-border/50">
        {STATUS_TABS.filter(s => s === 'All' || counts[s] > 0).map(status => {
          const meta = STATUS_META[status]
          const Icon = meta.icon
          const active = filterStatus === status
          return (
            <button key={status}
              onClick={() => { setFilterStatus(status); setCurrentPage(1) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-border/30'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {meta.label}
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                active ? 'bg-primary-foreground/20 text-primary-foreground' : meta.badge
              }`}>
                {counts[status]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden divide-y divide-border/50">
        {paginatedOrders.length > 0 ? paginatedOrders.map((order) => (
          <div key={order.id} className="px-4 py-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${SIDE_CLS[order.side]}`}>{order.side.toUpperCase()}</span>
                <span className="font-bold text-foreground tracking-wide">{order.symbol}</span>
                <span className={VALIDITY_CLS}>{order.orderType.toUpperCase()}</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${STATUS_ROW[order.status] ?? ''}`}>{order.status}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-mono">{fmtTime(order.createdAt)}</span>
              <span>Qty: <span className="text-foreground font-medium">{order.quantity.toLocaleString()}</span></span>
              <span>Filled: <span className={order.filledQuantity > 0 ? 'text-emerald-400 font-medium' : 'text-foreground'}>{order.filledQuantity.toLocaleString()}</span></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Avg: <span className="text-foreground">{fmtPrice(order.avgFillPriceKobo)}</span>
              </span>
              <span className="text-sm font-semibold text-foreground">{fmt(order.totalCostKobo)}</span>
              {order.status === 'pending' && (
                <button onClick={() => cancelMutation.mutate(order.id)}
                  disabled={cancelMutation.isPending}
                  className="flex items-center gap-1 px-2.5 py-1 text-red-400 hover:bg-red-500/15 rounded-lg border border-red-500/20 text-xs transition-colors">
                  <X className="w-3 h-3" /> Cancel
                </button>
              )}
            </div>
          </div>
        )) : (
          <div className="flex flex-col items-center py-10 px-4 text-center gap-4">
            {filterStatus === 'All' ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">No orders yet</p>
                  <p className="text-xs text-muted-foreground">Place your first buy or sell order to get started.</p>
                </div>
                <button onClick={() => navigate('/trade')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/20">
                  Place an Order <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4">No {filterStatus} orders</p>
            )}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background/40">
              {['Time', 'Symbol', 'Side', 'Type', 'Qty', 'Filled', 'Avg Price', 'Total (₦)', 'Status', ''].map((h, i) => (
                <th key={i} className={`py-2.5 px-4 text-muted-foreground font-medium text-[11px] uppercase tracking-wide ${i >= 4 && i <= 7 ? 'text-right' : i === 9 ? 'text-center' : 'text-left'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map((order, idx) => (
                <tr key={order.id} className={`border-b border-border/50 transition-colors hover:bg-primary/5 ${idx % 2 === 1 ? 'bg-background/20' : ''}`}>
                  <td className="py-3.5 px-4 text-muted-foreground text-xs font-mono">{fmtTime(order.createdAt)}</td>
                  <td className="py-3.5 px-4 font-bold text-foreground tracking-wide">{order.symbol}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${SIDE_CLS[order.side]}`}>{order.side.toUpperCase()}</span>
                  </td>
                  <td className="py-3.5 px-4 text-foreground text-xs capitalize">{order.orderType}</td>
                  <td className="py-3.5 px-4 text-right text-foreground tabular-nums">{order.quantity.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-right tabular-nums">
                    <span className={order.filledQuantity > 0 ? 'text-emerald-400' : 'text-muted-foreground'}>{order.filledQuantity.toLocaleString()}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-foreground tabular-nums text-xs">{fmtPrice(order.avgFillPriceKobo)}</td>
                  <td className="py-3.5 px-4 text-right text-foreground font-medium tabular-nums text-xs">{fmt(order.totalCostKobo)}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${STATUS_ROW[order.status] ?? ''}`}>{order.status}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {order.status === 'pending' ? (
                      <button onClick={() => cancelMutation.mutate(order.id)}
                        disabled={cancelMutation.isPending}
                        className="inline-flex items-center justify-center w-6 h-6 text-red-400 hover:bg-red-500/20 rounded-md transition-colors border border-red-500/20 disabled:opacity-50"
                        title="Cancel order">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10}>
                  <div className="flex flex-col items-center py-12 px-4 text-center gap-4">
                    {filterStatus === 'All' ? (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Receipt className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-1">No orders yet</p>
                          <p className="text-xs text-muted-foreground">Place your first buy or sell order to get started.</p>
                        </div>
                        <button onClick={() => navigate('/trade')}
                          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/20">
                          Place an Order <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No {filterStatus} orders</p>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-background/20">
          <span className="text-xs text-muted-foreground">
            Showing <span className="text-foreground font-medium">{startIdx + 1}–{Math.min(startIdx + ITEMS_PER_PAGE, filteredOrders.length)}</span> of <span className="text-foreground font-medium">{filteredOrders.length}</span>
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-border text-foreground hover:bg-primary/10 hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {pageNumbers.map(n => (
              <button key={n} onClick={() => goTo(n)}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                  n === currentPage ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-border/40 border border-transparent hover:border-border'
                }`}>
                {n}
              </button>
            ))}
            <button onClick={() => goTo(currentPage + 1)} disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-border text-foreground hover:bg-primary/10 hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
