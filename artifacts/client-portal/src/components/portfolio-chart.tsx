import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'

const ALL_DATA = [
  { date: 'Jan 1',  value: 2_200_000 },
  { date: 'Jan 8',  value: 2_320_000 },
  { date: 'Jan 15', value: 2_280_000 },
  { date: 'Jan 22', value: 2_450_000 },
  { date: 'Jan 29', value: 2_390_000 },
  { date: 'Feb 5',  value: 2_580_000 },
  { date: 'Feb 12', value: 2_670_000 },
  { date: 'Feb 19', value: 2_720_300 },
  { date: 'Feb 26', value: 2_690_000 },
  { date: 'Mar 5',  value: 2_810_000 },
  { date: 'Mar 12', value: 2_890_000 },
  { date: 'Mar 19', value: 2_950_000 },
]

const RANGES: { label: string; count: number }[] = [
  { label: '1W', count: 2 },
  { label: '1M', count: 4 },
  { label: '3M', count: 8 },
  { label: 'ALL', count: ALL_DATA.length },
]

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e2329] border border-border rounded px-3 py-2 shadow-xl">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold text-[#0ecb81] font-mono">
        ₦{(payload[0].value as number).toLocaleString('en-NG')}
      </p>
    </div>
  )
}

export default function PortfolioChart() {
  const [range, setRange] = useState(3)

  const data = ALL_DATA.slice(-RANGES[range].count)
  const first = data[0]?.value ?? 0
  const last = data[data.length - 1]?.value ?? 0
  const diff = last - first
  const diffPct = first > 0 ? (diff / first) * 100 : 0
  const up = diff >= 0

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-border">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">Portfolio Performance</p>
          <p className="text-2xl font-bold text-foreground font-mono">
            ₦{last.toLocaleString('en-NG')}
          </p>
          <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${up ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
            <TrendingUp className="w-3.5 h-3.5" />
            {up ? '+' : ''}₦{Math.abs(diff).toLocaleString('en-NG')} ({up ? '+' : ''}{diffPct.toFixed(2)}%)
            <span className="text-muted-foreground font-normal ml-1">vs period start</span>
          </div>
        </div>
        <div className="flex gap-0.5 bg-muted/40 rounded-md p-0.5">
          {RANGES.map((r, i) => (
            <button key={r.label}
              onClick={() => setRange(i)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                range === i ? 'bg-[#1e2329] text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 py-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#0ecb81" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0ecb81" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#848e9c' }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#848e9c' }}
              axisLine={false}
              tickLine={false}
              tickMargin={4}
              width={56}
              tickFormatter={(v) => `₦${(v / 1_000_000).toFixed(1)}M`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#0ecb81"
              strokeWidth={2}
              fill="url(#portfolioGrad)"
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 4, fill: '#0ecb81', stroke: '#0b0e11', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
