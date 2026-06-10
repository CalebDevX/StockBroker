import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AdminLayout, { Badge } from '@/components/admin-layout'
import { adminApi, fmtKobo, type AdminTransaction } from '@/lib/api'

const TYPE_COLORS: Record<string, 'green' | 'red' | 'blue' | 'amber' | 'gray'> = {
  deposit:    'green',
  withdrawal: 'red',
  buy:        'blue',
  sell:       'green',
  fee:        'amber',
  dividend:   'blue',
}

export default function AdminFunds() {
  const [page, setPage] = useState(0)
  const LIMIT = 50

  const { data, isLoading } = useQuery({
    queryKey: ['admin-transactions', page],
    queryFn:  () => adminApi.transactions({ limit: LIMIT, offset: page * LIMIT }),
  } as any)

  const txs: AdminTransaction[] = (data as any)?.transactions ?? []

  return (
    <AdminLayout title="Funds & Transactions" subtitle="All deposits, withdrawals and trade settlements">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : txs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No transactions yet</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    {['Time','Client','Type','Amount','Balance After','Reference','Bank','Description'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {txs.map((tx: AdminTransaction) => (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-secondary/10 transition-colors">
                      <td className="px-4 py-2.5 text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-medium text-foreground truncate max-w-[120px]">{tx.clientName ?? '—'}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{tx.clientEmail ?? ''}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge label={tx.type} variant={TYPE_COLORS[tx.type] ?? 'gray'} />
                      </td>
                      <td className={`px-4 py-2.5 text-xs font-semibold ${
                        tx.type === 'deposit' || tx.type === 'sell' || tx.type === 'dividend'
                          ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {tx.type === 'deposit' || tx.type === 'sell' || tx.type === 'dividend' ? '+' : '-'}
                        {fmtKobo(Math.abs(tx.amountKobo))}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-foreground">
                        {fmtKobo(tx.balanceAfterKobo)}
                      </td>
                      <td className="px-4 py-2.5 text-[10px] text-muted-foreground font-mono">{tx.reference}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{tx.bankName ?? '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[160px] truncate">
                        {tx.description ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">{txs.length} transactions</p>
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
