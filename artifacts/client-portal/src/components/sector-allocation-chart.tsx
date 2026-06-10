import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { portfolioApi, type SectorSlice } from '@/lib/api'
import { PieChart as PieChartIcon } from 'lucide-react'

const COLORS = ['#10b981', '#06b6d4', '#0ea5e9', '#6366f1', '#8b5cf6', '#f59e0b', '#f43f5e']

export default function SectorAllocationChart() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sector-allocation'],
    queryFn: portfolioApi.sectorAllocation,
    refetchInterval: 60_000,
  })

  const sectors: SectorSlice[] = data?.sectors ?? []

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="h-5 w-56 bg-border/50 rounded animate-pulse mb-6" />
        <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">
          Loading allocation…
        </div>
      </div>
    )
  }

  if (isError || !data?.hasPositions || sectors.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-6 text-lg font-semibold text-foreground">Portfolio Allocation by Sector</h2>
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-center">
          <PieChartIcon className="w-10 h-10 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium text-foreground">No positions held</p>
            <p className="text-xs text-muted-foreground mt-1">
              Sector allocation appears here once you hold equities.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const chartData = sectors.map(s => ({ name: s.name, value: s.percentage }))

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-6 text-lg font-semibold text-foreground">Portfolio Allocation by Sector</h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData} cx="50%" cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name} ${value}%`}
              outerRadius={110} fill="#10b981" dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value}%`, 'Allocation']}
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        {sectors.map((sector, index) => (
          <div key={sector.name} className="text-center">
            <div className="mb-2 h-3 w-3 rounded-full mx-auto" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <p className="text-xs font-medium text-muted-foreground">{sector.name}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{sector.percentage}%</p>
          </div>
        ))}
      </div>
    </div>
  )
}
