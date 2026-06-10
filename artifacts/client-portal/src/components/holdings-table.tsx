import { TrendingUp, TrendingDown, Loader2, BarChart2, ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'
import { portfolioApi, type Holding } from '@/lib/api'

export default function HoldingsTable() {
  const [, navigate] = useLocation()
  const { data, isLoading } = useQuery({
    queryKey: ['holdings'],
    queryFn: portfolioApi.holdings,
  })
  const holdings = data?.holdings ?? []

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Holdings</p>
        <button onClick={() => navigate('/portfolio')}
          className="text-[10px] text-muted-foreground hover:text-[#0ecb81] transition-colors flex items-center gap-1">
          View All <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Loading…</span>
        </div>
      ) : holdings.length === 0 ? (
        <div className="flex flex-col items-center py-10 px-4 text-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#0ecb81]/10 border border-[#0ecb81]/20 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-[#0ecb81]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">No positions yet</p>
            <p className="text-xs text-muted-foreground">Buy NGX stocks to build your portfolio.</p>
          </div>
          <button onClick={() => navigate('/trade')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0ecb81] text-[#0b0e11] text-xs font-bold rounded hover:bg-[#0ecb81]/90 transition-all">
            Browse Market <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {(['Symbol', 'Qty', 'Avg Cost', 'Last Price', 'Mkt Value', 'P&L'] as const).map((h, i) => (
                  <th key={h} className={`py-2.5 px-4 text-[9px] uppercase tracking-widest text-muted-foreground font-medium ${i > 0 ? 'text-right' : 'text-left'} ${i === 2 || i === 4 ? 'hidden sm:table-cell' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.slice(0, 8).map((h: Holding, idx) => (
                <tr key={h.symbol}
                  className={`border-b border-border/40 hover:bg-muted/20 transition-colors cursor-pointer ${idx % 2 === 1 ? 'bg-muted/5' : ''}`}
                  onClick={() => navigate('/trade')}
                >
                  <td className="py-3 px-4">
                    <p className="font-bold text-foreground tracking-wide">{h.symbol}</p>
                    {h.instrumentName && (
                      <p className="text-[9px] text-muted-foreground truncate max-w-[100px]">{h.instrumentName}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-foreground">{h.quantity.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono text-muted-foreground hidden sm:table-cell">
                    ₦{h.avgCostKobo ? (h.avgCostKobo / 100).toFixed(2) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-foreground">
                    ₦{(h.marketValueKobo / h.quantity / 100).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-foreground hidden sm:table-cell">
                    ₦{(h.marketValueKobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                      h.pnlPercent >= 0 ? 'bg-[#0ecb81]/15 text-[#0ecb81]' : 'bg-[#f6465d]/15 text-[#f6465d]'
                    }`}>
                      {h.pnlPercent >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {h.pnlPercent >= 0 ? '+' : ''}{h.pnlPercent.toFixed(2)}%
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
