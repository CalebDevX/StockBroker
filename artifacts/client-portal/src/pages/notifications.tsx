import { Bell, AlertTriangle, CheckCircle2, Clock3, TrendingUp, ShieldCheck, Loader2, MailOpen } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import DashboardSidebar from '@/components/dashboard-sidebar'
import { notificationsApi, type AppNotification } from '@/lib/api'

type NotifType = AppNotification['type']

function notifIcon(type: NotifType) {
  if (type === 'order_filled')    return TrendingUp
  if (type === 'kyc_update')      return ShieldCheck
  if (type.includes('withdraw') || type.includes('deposit')) return CheckCircle2
  if (type.includes('pending') || type.includes('review'))   return Clock3
  return AlertTriangle
}

function notifColor(type: NotifType) {
  if (type === 'order_filled')   return 'text-emerald-300'
  if (type === 'kyc_update')     return 'text-sky-300'
  if (type.includes('withdraw')) return 'text-amber-300'
  if (type.includes('deposit'))  return 'text-emerald-300'
  return 'text-sky-300'
}

function formatRelative(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1)  return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24)  return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7)  return `${diffDay}d ago`
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function NotifCard({ notif, onRead }: { notif: AppNotification; onRead: (id: string) => void }) {
  const Icon  = notifIcon(notif.type)
  const color = notifColor(notif.type)
  return (
    <div
      onClick={() => !notif.isRead && onRead(notif.id)}
      className={`rounded-[2rem] border bg-[#0b0e11]/80 p-5 shadow-[0_24px_48px_-32px_rgba(14,203,129,0.65)] transition-all cursor-pointer hover:border-[#0ecb81]/30 ${
        notif.isRead ? 'border-border opacity-70' : 'border-[#0ecb81]/15'
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 shrink-0 ${color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground leading-snug">{notif.title}</h2>
            {!notif.isRead && (
              <span className="w-2 h-2 rounded-full bg-[#0ecb81] shrink-0" />
            )}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{notif.message}</p>
          <p className="mt-2 text-[10px] text-muted-foreground/60 uppercase tracking-wide">{formatRelative(notif.createdAt)}</p>
        </div>
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 30_000,
  })

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const notifications = data?.notifications ?? []
  const unreadCount   = data?.unreadCount ?? 0

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 md:ml-56 overflow-auto pb-24 md:pb-0">
        <div className="p-4 md:p-8">
          {/* Header */}
          <div className="mb-8 rounded-[2rem] border border-[#0ecb81]/15 bg-gradient-to-br from-[#0b0e11] via-[#121820]/70 to-[#111821] p-8 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.65)] backdrop-blur-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-[#0ecb81]/80">Notifications</p>
                <h1 className="mt-3 text-3xl md:text-4xl font-bold text-foreground">Alerts & updates</h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Order executions, account updates, and compliance alerts in one place.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="inline-flex items-center gap-2 rounded-3xl border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-4 py-3 text-sm font-semibold text-[#0ecb81]">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    disabled={markAllRead.isPending}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MailOpen className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading notifications…</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#0ecb81]/10 border border-[#0ecb81]/20 flex items-center justify-center">
                <Bell className="w-7 h-7 text-[#0ecb81]/60" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">No notifications yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Order fills, KYC updates, and funding alerts will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {notifications.map((n) => (
                <NotifCard key={n.id} notif={n} onRead={(id) => markRead.mutate(id)} />
              ))}
            </div>
          )}

          {/* Notification preferences info */}
          <div className="mt-8 rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
            <h2 className="text-xl font-semibold text-foreground">Notification types</h2>
            <p className="mt-2 text-sm text-muted-foreground">You receive in-app alerts for the following events.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-[#0ecb81]/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#0ecb81]/80">Trade execution</p>
                <p className="mt-3 text-sm text-muted-foreground">Order filled, partially filled, rejected, or cancelled on NGX.</p>
              </div>
              <div className="rounded-3xl border border-[#0ecb81]/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#0ecb81]/80">Account & KYC</p>
                <p className="mt-3 text-sm text-muted-foreground">KYC approval, rejection, deposit confirmation, and withdrawal status.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
