import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, Search } from 'lucide-react'
import AdminLayout, { Badge, orderVariant } from '@/components/admin-layout'
import { adminApi, fmtKobo, type AdminOrderRow } from '@/lib/api'

const STATUSES = ['all','pending','submitted','partial','filled','cancelled','rejected','expired']

export default function AdminOrders() {
  const [status,  setStatus]  = useState('all')
  const [search,  setSearch]  = useState('')
  const [page,    setPage]    = useState(0)
  const qc = useQueryClient()
  const LIMIT = 50

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', status, page],
    queryFn:  () => adminApi.orders({
      status: status === 'all' ? undefined : status as never,
      limit:  LIMIT,
      offset: page * LIMIT,
    }),
  } as any)

  const updateMut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: 'filled' | 'cancelled' | 'rejected' }) =>
      adminApi.updateOrder(id, { status: s }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  })

  const orders = ((data as any)?.orders ?? []).filter((o: AdminOrderRow) =>
    !search || o.symbol.includes(search.toUpperCase()) ||
    (o.clientName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (o.clientEmail ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout title="Orders" subtitle="All client orders across the platform">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter by symbol or client…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(0) }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border capitalize transition-all ${
                status === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No orders found</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    {['Client','Symbol','Side','Type','Qty/Filled','Price','Value','Status','Time','Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: AdminOrderRow) => (
                    <tr key={o.orderId} className="border-b border-border/50 hover:bg-secondary/10 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-medium text-foreground truncate max-w-[120px]">{o.clientName ?? '—'}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{o.clientEmail ?? ''}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-bold text-foreground">{o.symbol}</td>
                      <td className="px-4 py-2.5">
                        <Badge label={o.side} variant={o.side === 'buy' ? 'green' : 'red'} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{o.orderType}</td>
                      <td className="px-4 py-2.5 text-xs text-foreground">
                        {o.filledQty}/{o.quantity}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-foreground">
                        {o.limitPriceKobo ? fmtKobo(o.limitPriceKobo) : 'MKT'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-foreground">
                        {o.totalCostKobo ? fmtKobo(o.totalCostKobo) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge label={o.status} variant={orderVariant(o.status)} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(o.createdAt).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-2.5">
                        {['pending','submitted','partial'].includes(o.status) && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateMut.mutate({ id: o.orderId, s: 'filled' })}
                              title="Force fill"
                              className="p-1.5 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => updateMut.mutate({ id: o.orderId, s: 'cancelled' })}
                              title="Cancel"
                              className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">{orders.length} results</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-3 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:bg-secondary/20 text-foreground">
                  Previous
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={((data as any)?.count ?? 0) < LIMIT}
                  className="px-3 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:bg-secondary/20 text-foreground">
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
