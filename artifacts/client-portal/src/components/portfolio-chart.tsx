import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, BarChart2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { portfolioApi, type ChartPoint } from '@/lib/api'

const RANGES: { label: string; days: number }[] = [
  { label: '1W', days: 7  },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: 'ALL', days: 999 },
]

function fmt(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e2329] border border-border rounded px-3 py-2 shadow-xl">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold text-[#0ecb81] font-mono">{fmt(payload[0].value)}</p>
    </div>
  )
}

export default function PortfolioChart() {
  const [rangeIdx, setRangeIdx] = useState(2)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['portfolio-chart'],
    queryFn: portfolioApi.chart,
    refetchInterval: 60_000,
  })

  const allPoints: ChartPoint[] = data?.points ?? []
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RANGES[rangeIdx].days)

  const points = RANGES[rangeIdx].days === 999
    ? allPoints
    : allPoints.filter(p => new Date(p.date) >= cutoff)

  const first = points[0]?.valueKobo ?? 0
  const last  = points[points.length - 1]?.valueKobo ?? 0
  const diff  = last - first
  const pct   = first > 0 ? (diff / first) * 100 : 0
  const up    = diff >= 0

  const chartData = points.map(p => ({
    date:  new Date(p.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }),
    value: p.valueKobo,
  }))

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-border">
          <div className="h-4 w-40 bg-border/50 rounded animate-pulse mb-2" />
          <div className="h-8 w-32 bg-border/50 rounded animate-pulse" />
        </div>
        <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
          Loading chart…
        </div>
      </div>
    )
  }

  if (isError || !data?.hasData || points.length < 2) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-border">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">
            Portfolio Performance
          </p>
          <p className="text-lg font-semibold text-muted-foreground">No chart data yet</p>
        </div>
        <div className="h-[220px] flex flex-col items-center justify-center gap-3 text-center px-6">
          <BarChart2 className="w-10 h-10 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-foreground">No transaction history</p>
            <p className="text-xs text-muted-foreground mt-1">
              Deposit funds and make trades to see your portfolio performance chart.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-border">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">
            Portfolio Performance
          </p>
          <p className="text-2xl font-bold text-foreground font-mono">{fmt(last)}</p>
          <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${up ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
            {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {up ? '+' : ''}{fmt(Math.abs(diff))} ({up ? '+' : ''}{pct.toFixed(2)}%)
            <span className="text-muted-foreground font-normal ml-1">vs period start</span>
          </div>
        </div>
        <div className="flex gap-0.5 bg-muted/40 rounded-md p-0.5">
          {RANGES.map((r, i) => (
            <button key={r.label}
              onClick={() => setRangeIdx(i)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                rangeIdx === i ? 'bg-[#1e2329] text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 py-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={up ? '#0ecb81' : '#f6465d'} stopOpacity={0.2} />
                <stop offset="95%" stopColor={up ? '#0ecb81' : '#f6465d'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#848e9c' }} axisLine={false} tickLine={false} tickMargin={8} />
            <YAxis
              tick={{ fontSize: 9, fill: '#848e9c' }} axisLine={false} tickLine={false} tickMargin={4} width={52}
              tickFormatter={(v) => v >= 1_000_000 ? `₦${(v / 1_000_000).toFixed(1)}M` : `₦${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone" dataKey="value"
              stroke={up ? '#0ecb81' : '#f6465d'} strokeWidth={2}
              fill="url(#portfolioGrad)" isAnimationActive={false} dot={false}
              activeDot={{ r: 4, fill: up ? '#0ecb81' : '#f6465d', stroke: '#0b0e11', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
