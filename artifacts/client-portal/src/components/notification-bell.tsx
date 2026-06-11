import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Bell, TrendingUp, ShieldCheck, CheckCircle2, Clock3,
  AlertTriangle, MailOpen, ArrowRight, X,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'wouter'
import { notificationsApi, type AppNotification } from '@/lib/api'

function notifIcon(type: string) {
  if (type === 'order_filled')                                return TrendingUp
  if (type === 'kyc_update')                                  return ShieldCheck
  if (type.includes('withdraw') || type.includes('deposit')) return CheckCircle2
  if (type.includes('pending')  || type.includes('review'))  return Clock3
  return AlertTriangle
}

function notifColor(type: string) {
  if (type === 'order_filled')   return 'text-[#0ecb81]'
  if (type === 'kyc_update')     return 'text-sky-400'
  if (type.includes('withdraw')) return 'text-amber-400'
  if (type.includes('deposit'))  return 'text-[#0ecb81]'
  return 'text-sky-400'
}

function iconBg(type: string) {
  if (type === 'order_filled')   return 'bg-[#0ecb81]/10'
  if (type === 'kyc_update')     return 'bg-sky-400/10'
  if (type.includes('withdraw')) return 'bg-amber-400/10'
  if (type.includes('deposit'))  return 'bg-[#0ecb81]/10'
  return 'bg-sky-400/10'
}

function formatRelative(dateStr: string) {
  const date = new Date(dateStr)
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (diffMin < 1)  return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24)  return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7)  return `${diffDay}d ago`
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
}

function NotifRow({ notif, onRead }: { notif: AppNotification; onRead: () => void }) {
  const Icon  = notifIcon(notif.type)
  const color = notifColor(notif.type)
  const bg    = iconBg(notif.type)

  return (
    <button
      onClick={() => { if (!notif.isRead) onRead() }}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] ${
        !notif.isRead ? 'bg-[#0ecb81]/[0.03]' : ''
      }`}
    >
      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold leading-snug truncate ${
            notif.isRead ? 'text-muted-foreground' : 'text-foreground'
          }`}>
            {notif.title}
          </p>
          {!notif.isRead && (
            <span className="w-2 h-2 rounded-full bg-[#0ecb81] shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 leading-relaxed">
          {notif.message}
        </p>
        <p className="text-[10px] text-muted-foreground/50 mt-1 uppercase tracking-wide">
          {formatRelative(notif.createdAt)}
        </p>
      </div>
    </button>
  )
}

export default function NotificationBell() {
  const [open, setOpen]         = useState(false)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})
  const btnRef   = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [, nav]  = useLocation()
  const qc       = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn:  notificationsApi.list,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['notifications'] })
      const prev = qc.getQueryData<{ notifications: AppNotification[]; unreadCount: number }>(['notifications'])
      if (prev) {
        qc.setQueryData(['notifications'], {
          ...prev,
          notifications: prev.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['notifications'], ctx.prev) },
  })

  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const notifications = (data?.notifications ?? []).slice(0, 8)
  const unreadCount   = data?.unreadCount ?? 0
  const badge         = unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : null

  function calcPanelStyle() {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const isMobile = window.innerWidth < 768
    if (isMobile) {
      setPanelStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: 12,
        right: 12,
        zIndex: 9999,
      })
    } else {
      const right = window.innerWidth - rect.right
      setPanelStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        right: Math.min(right, window.innerWidth - 356),
        width: 344,
        zIndex: 9999,
      })
    }
  }

  function toggle() {
    if (!open) calcPanelStyle()
    setOpen(v => !v)
  }

  function close() { setOpen(false) }

  function goToAll() { close(); nav('/notifications') }

  // Click outside
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const target = e.target as Node
      if (
        !panelRef.current?.contains(target) &&
        !btnRef.current?.contains(target)
      ) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Reposition on resize
  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', calcPanelStyle)
    return () => window.removeEventListener('resize', calcPanelStyle)
  }, [open])

  const panel = open ? createPortal(
    <div
      ref={panelRef}
      style={panelStyle}
      className="bg-[#111821] border border-[#0ecb81]/15 rounded-2xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col animate-in fade-in-0 slide-in-from-top-2 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#0ecb81]" />
          <span className="text-sm font-bold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-[#0ecb81] text-[#0b0e11] rounded-full px-1.5 py-0.5 leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
            >
              <MailOpen className="w-3 h-3" />
              Mark all read
            </button>
          )}
          <button
            onClick={close}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: 'min(400px, 60vh)' }}>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-6">
            <div className="w-10 h-10 rounded-2xl bg-[#0ecb81]/10 border border-[#0ecb81]/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#0ecb81]/60" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">All caught up</p>
              <p className="text-xs text-muted-foreground mt-0.5">No new notifications</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {notifications.map(n => (
              <NotifRow
                key={n.id}
                notif={n}
                onRead={() => markRead.mutate(n.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <button
        onClick={goToAll}
        className="w-full flex items-center justify-center gap-1.5 py-3 border-t border-border/60 text-xs font-semibold text-[#0ecb81] hover:bg-[#0ecb81]/5 transition-colors shrink-0"
      >
        See all notifications
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>,
    document.body
  ) : null

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label={`Notifications${badge ? ` (${badge} unread)` : ''}`}
        className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-colors ${
          open
            ? 'bg-[#0ecb81]/15 text-[#0ecb81]'
            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
        }`}
      >
        <Bell className="w-4 h-4" />
        {badge && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-[#0ecb81] text-[#0b0e11] text-[9px] font-black px-0.5 leading-none border border-[#111821]">
            {badge}
          </span>
        )}
      </button>
      {panel}
    </>
  )
}
