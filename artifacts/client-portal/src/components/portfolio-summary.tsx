import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { portfolioApi, fmtKobo } from '@/lib/api'

export default function PortfolioSummary() {
  const { data, isLoading } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: portfolioApi.summary,
  })

  const isPositive = (data?.unrealisedPnlKobo ?? 0) >= 0

  function Skeleton() {
    return <div className="h-8 w-32 bg-border/50 rounded animate-pulse mt-2" />
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm font-medium text-muted-foreground">Total Portfolio Value</p>
        {isLoading ? <Skeleton /> : (
          <p className="mt-2 text-2xl font-bold text-foreground">
            {data ? fmtKobo(data.totalPortfolioKobo) : '—'}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm font-medium text-muted-foreground">Unrealised P&L</p>
        {isLoading ? <Skeleton /> : (
          <div className="mt-2 flex items-end gap-2">
            <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {data ? fmtKobo(data.unrealisedPnlKobo) : '—'}
            </p>
            {data && (
              <div className="flex items-center gap-1 pb-1">
                {isPositive
                  ? <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  : <ArrowDownRight className="h-4 w-4 text-red-500" />
                }
                <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                  {Math.abs(data.pnlPercent).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm font-medium text-muted-foreground">Cash Balance</p>
        {isLoading ? <Skeleton /> : (
          <p className="mt-2 text-2xl font-bold text-foreground">
            {data ? fmtKobo(data.cashBalanceKobo) : '—'}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm font-medium text-muted-foreground">Holdings</p>
        {isLoading ? <Skeleton /> : (
          <p className="mt-2 text-2xl font-bold text-foreground">{data?.holdingsCount ?? 0}</p>
        )}
      </div>
    </div>
  )
}
