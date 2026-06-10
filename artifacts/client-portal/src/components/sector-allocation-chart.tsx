import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const sectorData = [
  { name: 'Financial Services', value: 35 },
  { name: 'Energy',             value: 28 },
  { name: 'Materials',          value: 18 },
  { name: 'Technology',         value: 12 },
  { name: 'Consumer',           value: 7  },
]

const COLORS = ['#10b981', '#06b6d4', '#0ea5e9', '#6366f1', '#8b5cf6']

export default function SectorAllocationChart() {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-6 text-lg font-semibold text-foreground">Portfolio Allocation by Sector</h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sectorData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name} ${value}%`}
              outerRadius={110}
              fill="#10b981"
              dataKey="value"
            >
              {sectorData.map((_, index) => (
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
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {sectorData.map((sector, index) => (
          <div key={sector.name} className="text-center">
            <div className="mb-2 h-3 w-3 rounded-full mx-auto" style={{ backgroundColor: COLORS[index] }} />
            <p className="text-xs font-medium text-muted-foreground">{sector.name}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{sector.value}%</p>
          </div>
        ))}
      </div>
    </div>
  )
}
