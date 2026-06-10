import { useQuery } from '@tanstack/react-query'
import { portfolioApi, type Transaction } from '@/lib/api'
import { Loader2 } from 'lucide-react'

const TYPE_COLOR: Record<string, string> = {
  deposit:    'text-emerald-500',
  buy:        'text-slate-400',
  sell:       'text-sky-500',
  withdrawal: 'text-red-500',
}
const TYPE_BADGE: Record<string, string> = {
  deposit:    'bg-emerald-500/10 text-emerald-500',
  buy:        'bg-slate-500/10 text-slate-400',
  sell:       'bg-sky-500/10 text-sky-500',
  withdrawal: 'bg-red-500/10 text-red-500',
}
const CREDIT_TYPES = new Set(['deposit', 'sell'])

export default function TransactionHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => portfolioApi.transactions(20),
  })
  const txs = data?.transactions ?? []

  const fmt = (kobo: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(kobo / 100)
  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-foreground">Transaction History</h2>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : txs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No transactions yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border">
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Date</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Type</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Description</th>
                <th className="px-6 py-3 text-right font-semibold text-muted-foreground">Amount (₦)</th>
                <th className="px-6 py-3 text-right font-semibold text-muted-foreground">Balance (₦)</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx: Transaction) => {
                const isCredit = CREDIT_TYPES.has(tx.type)
                return (
                  <tr key={tx.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-foreground">{fmtDate(tx.createdAt)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${TYPE_BADGE[tx.type] ?? 'bg-border/30 text-muted-foreground'}`}>{tx.type}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs max-w-[160px] truncate">{tx.description}</td>
                    <td className={`px-6 py-4 text-right font-semibold ${TYPE_COLOR[tx.type] ?? 'text-foreground'}`}>
                      {isCredit ? '+' : '-'}{fmt(tx.amountKobo)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-foreground">{fmt(tx.balanceAfterKobo)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
