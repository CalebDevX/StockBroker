import { ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { portfolioApi, type Holding } from '@/lib/api'

export default function PortfolioHoldingsTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['holdings'],
    queryFn: portfolioApi.holdings,
  })
  const holdings = data?.holdings ?? []

  const fmt = (kobo: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
    }).format(kobo / 100)

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-foreground">Holdings</h2>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : holdings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm px-6">
          No holdings yet. Use the Trade page to buy your first stock.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border">
                {['Symbol', 'Company', 'Qty', 'Avg Cost (₦)', 'Current (₦)', 'Market Value (₦)', 'P&L (₦)', 'P&L %'].map((h, i) => (
                  <th key={h} className={`px-6 py-3 font-semibold text-muted-foreground ${i >= 2 ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.map((h: Holding) => (
                <tr key={h.symbol} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-semibold text-primary">{h.symbol}</td>
                  <td className="px-6 py-4 text-foreground text-xs max-w-[140px]">
                    <p className="truncate">{h.instrumentName ?? '—'}</p>
                    {h.sector && <p className="text-muted-foreground truncate">{h.sector}</p>}
                  </td>
                  <td className="px-6 py-4 text-right text-foreground">{h.quantity.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-foreground">{fmt(h.avgCostKobo)}</td>
                  <td className="px-6 py-4 text-right text-foreground">{fmt(h.currentPriceKobo)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-foreground">{fmt(h.marketValueKobo)}</td>
                  <td className={`px-6 py-4 text-right font-semibold ${h.unrealisedPnlKobo >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {fmt(h.unrealisedPnlKobo)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {h.pnlPercent >= 0
                        ? <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                        : <ArrowDownRight className="h-4 w-4 text-red-500" />
                      }
                      <span className={`font-semibold ${h.pnlPercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {Math.abs(h.pnlPercent).toFixed(2)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
