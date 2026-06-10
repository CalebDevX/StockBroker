import { useState } from 'react'
import { FileText, Download, CalendarDays, Loader2, ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import DashboardSidebar from '@/components/dashboard-sidebar'
import { reportsApi, fmtKobo, type Transaction } from '@/lib/api'

function TxIcon({ type }: { type: string }) {
  if (type === 'deposit')    return <ArrowDownToLine className="w-4 h-4 text-[#0ecb81]" />
  if (type === 'withdrawal') return <ArrowUpFromLine className="w-4 h-4 text-[#f6465d]" />
  if (type === 'buy')        return <TrendingUp className="w-4 h-4 text-sky-400" />
  if (type === 'sell')       return <TrendingDown className="w-4 h-4 text-amber-400" />
  return <FileText className="w-4 h-4 text-muted-foreground" />
}

function txColor(type: string) {
  if (type === 'deposit' || type === 'sell' || type === 'dividend') return 'text-[#0ecb81]'
  return 'text-foreground'
}

function txSign(type: string) {
  return (type === 'deposit' || type === 'sell' || type === 'dividend') ? '+' : '-'
}

function groupByMonth(txs: Transaction[]) {
  const map = new Map<string, Transaction[]>()
  for (const tx of txs) {
    const d = new Date(tx.createdAt)
    const key = d.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(tx)
  }
  return map
}

export default function ReportsPage() {
  const [from, setFrom] = useState('')
  const [to,   setTo]   = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['reports-transactions', from, to],
    queryFn:  () => reportsApi.transactions({ from: from || undefined, to: to || undefined, limit: 200 }),
    refetchInterval: 60_000,
  })

  const txs = data?.transactions ?? []
  const grouped = groupByMonth(txs)

  function downloadCsv() {
    const url = reportsApi.csvUrl({ from: from || undefined, to: to || undefined })
    // Use fetch with auth header and create blob download
    const token = localStorage.getItem('access_token') ?? ''
    const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api'
    const params = new URLSearchParams({ format: 'csv' })
    if (from) params.set('from', from)
    if (to)   params.set('to', to)
    fetch(`${apiBase}/reports/transactions?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `transactions${from ? '-' + from : ''}${to ? '-to-' + to : ''}.csv`
        a.click()
        URL.revokeObjectURL(a.href)
      })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 md:ml-56 overflow-auto pb-24 md:pb-0">
        <div className="p-4 md:p-8">
          {/* Header */}
          <div className="mb-8 rounded-[2rem] border border-[#0ecb81]/15 bg-gradient-to-br from-[#0b0e11] via-[#121820]/70 to-[#111821] p-8 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.65)] backdrop-blur-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-[#0ecb81]/80">Reports</p>
                <h1 className="mt-3 text-3xl md:text-4xl font-bold text-foreground">Statements & activity</h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Download account statements and trade history for any reporting period.
                </p>
              </div>
              <button
                onClick={downloadCsv}
                disabled={isLoading || txs.length === 0}
                className="inline-flex items-center gap-2 rounded-3xl border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-4 py-3 text-sm font-semibold text-[#0ecb81] hover:bg-[#0ecb81]/20 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>

          {/* Date filter */}
          <div className="mb-6 rounded-[2rem] border border-border bg-card p-5">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
              <label className="text-sm text-muted-foreground shrink-0">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#0ecb81]" />
              <label className="text-sm text-muted-foreground shrink-0">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#0ecb81]" />
              {(from || to) && (
                <button onClick={() => { setFrom(''); setTo('') }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Clear
                </button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {txs.length} transaction{txs.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.6fr_0.4fr]">
            {/* Transactions list */}
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)] overflow-hidden">
              <div className="flex items-center justify-between gap-3 p-5 border-b border-border">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Transaction history</h2>
                  <p className="mt-1 text-sm text-muted-foreground">All deposits, withdrawals and trades on your account.</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-3 py-1 text-xs font-semibold text-[#0ecb81]">
                  <FileText className="w-3.5 h-3.5" /> Live
                </span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading transactions…</span>
                </div>
              ) : txs.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 text-center px-6">
                  <FileText className="w-10 h-10 text-muted-foreground/40" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">No transactions found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {from || to ? 'No transactions in the selected date range.' : 'Deposit funds to get started.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  {Array.from(grouped.entries()).map(([month, monthTxs]) => (
                    <div key={month}>
                      <div className="px-5 py-2 bg-border/20 border-b border-border">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">{month}</p>
                      </div>
                      {monthTxs.map(tx => (
                        <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50 hover:bg-[#111821]/60 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-border/30 flex items-center justify-center shrink-0">
                            <TxIcon type={tx.type} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground capitalize">{tx.type}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{tx.description || tx.reference}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-semibold ${txColor(tx.type)}`}>
                              {txSign(tx.type)}{fmtKobo(Math.abs(tx.amountKobo))}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tools panel */}
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
              <h2 className="text-xl font-semibold text-foreground">Report tools</h2>
              <div className="mt-6 space-y-4">
                <button
                  onClick={downloadCsv}
                  disabled={isLoading || txs.length === 0}
                  className="w-full rounded-3xl border border-[#0ecb81]/10 bg-[#111821]/80 p-4 text-left hover:border-[#0ecb81]/30 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#0ecb81]/80 mb-2">
                    <Download className="w-3.5 h-3.5" /> CSV export
                  </div>
                  <p className="text-sm text-muted-foreground">Download transactions as CSV for spreadsheet or tax review.</p>
                </button>
                <div className="rounded-3xl border border-[#0ecb81]/10 bg-[#111821]/80 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#0ecb81]/80 mb-2">Tax-ready</p>
                  <p className="text-sm text-muted-foreground">Include the full year date range for a complete tax-year record.</p>
                </div>
                <div className="rounded-3xl border border-[#0ecb81]/10 bg-[#111821]/80 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#0ecb81]/80 mb-2">Settlement note</p>
                  <p className="text-sm text-muted-foreground">Trades settle T+2. Pending settlements may not appear in your balance immediately.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
