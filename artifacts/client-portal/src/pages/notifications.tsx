import { Bell, AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react'
import DashboardSidebar from '@/components/dashboard-sidebar'

const MOCK_ALERTS = [
  {
    title: 'Price alert: AIRTEL up 4.1%',
    message: 'AIRTEL stock has moved above your alert threshold of ₦3,250.',
    type: 'info',
  },
  {
    title: 'Withdrawal request processed',
    message: 'Your withdrawal for ₦280,000 has been completed and credited to your bank.',
    type: 'success',
  },
  {
    title: 'KYC documents received',
    message: 'Your verification documents are under review by compliance.',
    type: 'pending',
  },
] as const

type AlertType = (typeof MOCK_ALERTS)[number]['type']

function AlertCard({ title, message, type }: { title: string; message: string; type: AlertType }) {
  const color = type === 'success' ? 'text-emerald-300' : type === 'pending' ? 'text-amber-300' : 'text-sky-300'
  const Icon = type === 'success' ? CheckCircle2 : type === 'pending' ? Clock3 : AlertTriangle

  return (
    <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-5 shadow-[0_24px_48px_-32px_rgba(14,203,129,0.65)]">
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 md:ml-56 overflow-auto pb-24 md:pb-0">
        <div className="p-4 md:p-8">
          <div className="mb-8 rounded-[2rem] border border-[#0ecb81]/15 bg-gradient-to-br from-[#0b0e11] via-[#121820]/70 to-[#111821] p-8 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.65)] backdrop-blur-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-[#0ecb81]/80">Notifications</p>
                <h1 className="mt-3 text-3xl md:text-4xl font-bold text-foreground">Alerts and updates</h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Stay on top of market moves, funding updates, and account security alerts in one place.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-3xl border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-4 py-3 text-sm font-semibold text-[#0ecb81]">
                <Bell className="w-4 h-4" /> Real-time alerts
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {MOCK_ALERTS.map((alert) => (
              <AlertCard key={alert.title} {...alert} />
            ))}
          </div>

          <div className="mt-8 rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
            <h2 className="text-xl font-semibold text-foreground">Notification settings</h2>
            <p className="mt-2 text-sm text-muted-foreground">Update your alert preferences for trading, account activity, and verification status.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-[#0ecb81]/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#0ecb81]/80">Market alerts</p>
                <p className="mt-3 text-sm text-muted-foreground">Price movement notifications, watchlist triggers, and order execution alerts.</p>
              </div>
              <div className="rounded-3xl border border-[#0ecb81]/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#0ecb81]/80">Account updates</p>
                <p className="mt-3 text-sm text-muted-foreground">Deposit/withdrawal notifications, password changes, and important security alerts.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
