import { FileText, Download, CalendarDays, BarChart2 } from 'lucide-react'
import DashboardSidebar from '@/components/dashboard-sidebar'

const STATEMENTS = [
  { date: '2026-05-31', type: 'Monthly statement', status: 'Ready' },
  { date: '2026-04-30', type: 'Monthly statement', status: 'Ready' },
  { date: '2026-03-31', type: 'Monthly statement', status: 'Ready' },
]

export default function ReportsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 md:ml-56 overflow-auto pb-24 md:pb-0">
        <div className="p-4 md:p-8">
          <div className="mb-8 rounded-[2rem] border border-[#0ecb81]/15 bg-gradient-to-br from-[#0b0e11] via-[#121820]/70 to-[#111821] p-8 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.65)] backdrop-blur-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-[#0ecb81]/80">Reports</p>
                <h1 className="mt-3 text-3xl md:text-4xl font-bold text-foreground">Statements & activity</h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Download account statements, trade history, and performance reports for any reporting period.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-3xl border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-4 py-3 text-sm font-semibold text-[#0ecb81]">
                <Download className="w-4 h-4" /> Export PDF
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Recent reports</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Statements generated from your account activity and trade history.</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-3 py-1 text-xs font-semibold text-[#0ecb81]">
                  <FileText className="w-4 h-4" /> Statements
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {STATEMENTS.map((statement) => (
                  <div key={statement.date} className="rounded-3xl border border-[#0ecb81]/10 bg-[#111821]/80 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{statement.type}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[#0ecb81]/70">{statement.date}</p>
                      </div>
                      <span className="rounded-full bg-[#0ecb81]/10 px-3 py-1 text-xs font-semibold text-[#0ecb81]">{statement.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
              <h2 className="text-xl font-semibold text-foreground">Report tools</h2>
              <div className="mt-6 space-y-4">
                <div className="rounded-3xl border border-[#0ecb81]/10 bg-[#111821]/80 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#0ecb81]/80">Tax-ready export</p>
                  <p className="mt-2 text-sm text-muted-foreground">Download statements for tax season and compliance review.</p>
                </div>
                <div className="rounded-3xl border border-[#0ecb81]/10 bg-[#111821]/80 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#0ecb81]/80">Performance summary</p>
                  <p className="mt-2 text-sm text-muted-foreground">Review gains, losses, and portfolio return metrics for the selected date range.</p>
                </div>
                <div className="rounded-3xl border border-[#0ecb81]/10 bg-[#111821]/80 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#0ecb81]/80">Monthly snapshots</p>
                  <p className="mt-2 text-sm text-muted-foreground">Create month-end snapshots of holdings and account equity.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
