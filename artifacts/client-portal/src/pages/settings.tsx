import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from 'wouter'
import {
  User, ShieldCheck, Bell, BadgeCheck,
  LogOut, Key, FileText, MessageSquare,
  ArrowDownLeft, ArrowUpRight, TrendingUp,
  ChevronRight, Copy, Check, HelpCircle,
  BookOpen, Lock,
} from 'lucide-react'
import DashboardSidebar from '@/components/dashboard-sidebar'
import { notificationsApi, portfolioApi, type NotifPrefs } from '@/lib/api'

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function fmt(kobo: number) {
  const abs = Math.abs(kobo / 100)
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(abs)
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 px-1 mb-1.5 mt-5">
      {children}
    </p>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false)
  const canCopy = mono

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-sm font-medium text-foreground truncate ${mono ? 'font-mono text-xs' : ''}`}>
          {value}
        </span>
        {canCopy && (
          <button onClick={copy} className="shrink-0 text-muted-foreground hover:text-[#0ecb81] transition">
            {copied
              ? <Check className="w-3.5 h-3.5 text-[#0ecb81]" />
              : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  )
}

function ActionRow({
  label, desc, icon: Icon, onClick, iconBg = 'bg-[#0ecb81]/10', iconColor = 'text-[#0ecb81]', danger = false,
}: { label: string; desc?: string; icon: React.ElementType; onClick?: () => void; iconBg?: string; iconColor?: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.02] ${danger ? 'hover:bg-[#f6465d]/5' : ''}`}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-[#f6465d]' : 'text-foreground'}`}>{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
    </button>
  )
}

function PrefToggle({
  value, onChange, label, desc,
}: { value: boolean; onChange: (v: boolean) => void; label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        aria-label={`Toggle ${label}`}
        className={`relative w-10 h-[22px] rounded-full transition-colors shrink-0 ${value ? 'bg-[#0ecb81]' : 'bg-muted/60'}`}
      >
        <span className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${value ? 'translate-x-[18px]' : ''}`} />
      </button>
    </div>
  )
}

function NotificationsSection() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notif-prefs'],
    queryFn:  () => notificationsApi.getPrefs(),
  })

  const saveMut = useMutation({
    mutationFn: (patch: Partial<NotifPrefs>) => notificationsApi.updatePrefs(patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ['notif-prefs'] })
      const prev = qc.getQueryData<{ prefs: NotifPrefs }>(['notif-prefs'])
      if (prev) qc.setQueryData(['notif-prefs'], { prefs: { ...prev.prefs, ...patch } })
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['notif-prefs'], ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notif-prefs'] }),
  })

  const prefs = data?.prefs
  const set = (key: keyof NotifPrefs) => (val: boolean) => saveMut.mutate({ [key]: val })

  const appItems: { key: keyof NotifPrefs; label: string; desc: string }[] = [
    { key: 'app_trade_fills',  label: 'Trade fills',           desc: 'When a buy or sell order is executed'      },
    { key: 'app_price_alerts', label: 'Price alerts',          desc: 'Significant moves in your holdings'        },
    { key: 'app_deposits',     label: 'Deposits & withdrawals',desc: 'Fund activity on your account'             },
    { key: 'app_kyc_updates',  label: 'KYC status',            desc: 'Verification updates from compliance'      },
    { key: 'app_market_news',  label: 'Market news',           desc: 'NGX announcements & corporate actions'     },
  ]

  const waItems: { key: keyof NotifPrefs; label: string; desc: string }[] = [
    { key: 'wa_order_filled',   label: 'Order fills',      desc: 'WhatsApp message when your order executes' },
    { key: 'wa_deposit',        label: 'Deposits',         desc: 'Confirmation when funds are credited'      },
    { key: 'wa_withdrawal',     label: 'Withdrawals',      desc: 'Confirmation when a withdrawal is submitted'},
    { key: 'wa_order_rejected', label: 'Order rejections', desc: 'Alert if an order is rejected'             },
  ]

  if (isLoading || !prefs) {
    return (
      <Card className="animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3.5 gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-28 bg-muted/40 rounded" />
              <div className="h-2.5 w-44 bg-muted/25 rounded" />
            </div>
            <div className="w-10 h-[22px] bg-muted/30 rounded-full shrink-0" />
          </div>
        ))}
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.02]">
          <Bell className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">In-app</p>
        </div>
        {appItems.map(({ key, label, desc }) => (
          <PrefToggle key={key} value={prefs[key]} onChange={set(key)} label={label} desc={desc} />
        ))}
      </Card>

      <Card className="border-[#25d366]/20">
        <div className="flex items-center gap-2 px-4 py-3 bg-[#25d366]/5">
          <MessageSquare className="w-3.5 h-3.5 text-[#25d366]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#25d366]">WhatsApp alerts</p>
        </div>
        {waItems.map(({ key, label, desc }) => (
          <PrefToggle key={key} value={prefs[key]} onChange={set(key)} label={label} desc={desc} />
        ))}
        <div className="px-4 py-3">
          <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
            Sent to the phone number on your account. Requires Achek WhatsApp integration.
          </p>
        </div>
      </Card>

      {saveMut.isError && (
        <p className="text-xs text-[#f6465d] text-center">Failed to save — please try again.</p>
      )}
    </div>
  )
}

function KycStatusCard({ user }: { user: any }) {
  const [, nav] = useLocation()
  const status: string = user?.kycStatus ?? 'unverified'
  const tier: string = user?.kycTier ?? '0'

  const statusColor =
    status === 'approved'  ? 'text-[#0ecb81] bg-[#0ecb81]/10 border-[#0ecb81]/20' :
    status === 'pending'   ? 'text-[#f0b90b] bg-[#f0b90b]/10 border-[#f0b90b]/20' :
    status === 'rejected'  ? 'text-[#f6465d] bg-[#f6465d]/10 border-[#f6465d]/20' :
                             'text-muted-foreground bg-muted/20 border-border'

  const steps = [
    { label: 'Personal information',               done: true },
    { label: 'Identity document (NIN / passport)', done: status !== 'unverified' },
    { label: 'Proof of address',                   done: status === 'approved' || status === 'pending' },
    { label: 'Broker review & approval',           done: status === 'approved' },
  ]

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/60">
        <div>
          <p className="text-sm font-semibold text-foreground">Identity verification</p>
          <p className="text-xs text-muted-foreground mt-0.5">Tier {tier} account</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${statusColor}`}>
          {status}
        </span>
      </div>

      <div className="px-4 py-4 space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors ${
              s.done ? 'bg-[#0ecb81] text-[#0b0e11]' : 'border border-border text-muted-foreground'
            }`}>
              {s.done ? '✓' : i + 1}
            </div>
            <span className={`text-sm ${s.done ? 'text-foreground' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {status !== 'approved' && (
        <div className="px-4 pb-4">
          <button
            onClick={() => nav('/kyc')}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0ecb81] text-[#0b0e11] py-3 text-sm font-bold transition hover:bg-[#0ecb81]/90"
          >
            Continue verification <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const [, nav] = useLocation()
  const avatarText = user?.fullName ? initials(user.fullName) : 'U'

  const { data: portfolio } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: () => portfolioApi.summary(),
    staleTime: 30_000,
  })

  const cashKobo    = portfolio?.cashBalanceKobo    ?? user?.cashBalanceKobo ?? 0
  const equityKobo  = portfolio?.totalEquityValueKobo ?? 0
  const pnlKobo     = portfolio?.unrealisedPnlKobo ?? 0
  const pnlPct      = portfolio?.pnlPercent ?? 0
  const pnlPositive = pnlKobo >= 0

  const clientId = user?.id ? `NGX-${String(user.id).padStart(6, '0')}` : '—'
  const chn      = user?.chn ?? '—'

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />

      <div className="flex-1 pl-0 md:pl-56 flex flex-col pb-24 md:pb-6">
        <div className="w-full max-w-lg mx-auto px-4 pt-6 md:pt-8">

          {/* ── Identity card ─────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-gradient-to-b from-card to-[#0b0e11] overflow-hidden mb-1">
            <div className="flex items-center gap-4 px-5 pt-6 pb-4">
              <div className="w-14 h-14 rounded-full bg-[#0ecb81]/15 border-2 border-[#0ecb81]/30 flex items-center justify-center shrink-0">
                <span className="text-lg font-black text-[#0ecb81]">{avatarText}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-bold text-foreground leading-tight truncate">
                  {user?.fullName ?? 'Account'}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{user?.email}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                    user?.kycStatus === 'approved' ? 'text-[#0ecb81] bg-[#0ecb81]/10 border-[#0ecb81]/20'
                    : user?.kycStatus === 'pending' ? 'text-[#f0b90b] bg-[#f0b90b]/10 border-[#f0b90b]/20'
                    : 'text-muted-foreground bg-muted/20 border-border'
                  }`}>
                    KYC {user?.kycStatus ?? 'unverified'}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    Tier {user?.kycTier ?? '0'}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial snapshot */}
            <div className="grid grid-cols-3 border-t border-border/60">
              <div className="px-4 py-3.5 border-r border-border/60">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Cash</p>
                <p className="text-sm font-bold text-foreground tabular-nums">{fmt(cashKobo)}</p>
              </div>
              <div className="px-4 py-3.5 border-r border-border/60">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Equity</p>
                <p className="text-sm font-bold text-foreground tabular-nums">{fmt(equityKobo)}</p>
              </div>
              <div className="px-4 py-3.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">P&L</p>
                <p className={`text-sm font-bold tabular-nums ${pnlPositive ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {pnlPositive ? '+' : '-'}{fmt(pnlKobo)}
                  <span className="text-[10px] font-semibold ml-1 opacity-70">
                    ({pnlPositive ? '+' : ''}{pnlPct.toFixed(1)}%)
                  </span>
                </p>
              </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-2 px-4 py-4 border-t border-border/60">
              <button
                onClick={() => nav('/funds')}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-[#0ecb81]/10 border border-[#0ecb81]/15 py-3 transition hover:bg-[#0ecb81]/15"
              >
                <ArrowDownLeft className="w-4 h-4 text-[#0ecb81]" />
                <span className="text-[10px] font-bold text-[#0ecb81]">Deposit</span>
              </button>
              <button
                onClick={() => nav('/funds')}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-muted/20 border border-border py-3 transition hover:bg-muted/30"
              >
                <ArrowUpRight className="w-4 h-4 text-foreground" />
                <span className="text-[10px] font-bold text-foreground">Withdraw</span>
              </button>
              <button
                onClick={() => nav('/reports')}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-muted/20 border border-border py-3 transition hover:bg-muted/30"
              >
                <FileText className="w-4 h-4 text-foreground" />
                <span className="text-[10px] font-bold text-foreground">Statement</span>
              </button>
            </div>
          </div>

          {/* ── Account details ───────────────────────────────────────── */}
          <SectionLabel>Account details</SectionLabel>
          <Card>
            <InfoRow label="Full name"  value={user?.fullName ?? '—'} />
            <InfoRow label="Email"      value={user?.email    ?? '—'} />
            <InfoRow label="Phone"      value={user?.phone    ?? '—'} />
            <InfoRow label="Client ID"  value={clientId}       mono />
            <InfoRow label="CHN"        value={chn}            mono />
          </Card>

          {/* ── Verification ─────────────────────────────────────────── */}
          <SectionLabel>Verification</SectionLabel>
          <KycStatusCard user={user} />

          {/* ── Notifications ────────────────────────────────────────── */}
          <SectionLabel>Notifications</SectionLabel>
          <NotificationsSection />

          {/* ── Security ─────────────────────────────────────────────── */}
          <SectionLabel>Security</SectionLabel>
          <Card>
            <ActionRow
              label="Change password"
              desc="Update your login credentials"
              icon={Key}
            />
            <ActionRow
              label="Two-factor authentication"
              desc="Second layer on sign-in · Enabled"
              icon={ShieldCheck}
            />
            <ActionRow
              label="Active sessions"
              desc="This device · Current session"
              icon={Lock}
            />
          </Card>

          {/* ── Support & legal ──────────────────────────────────────── */}
          <SectionLabel>Support & legal</SectionLabel>
          <Card>
            <ActionRow
              label="Help & support"
              desc="Chat with our support team"
              icon={HelpCircle}
              iconBg="bg-blue-500/10"
              iconColor="text-blue-400"
            />
            <ActionRow
              label="Orders & activity"
              desc="View your full order history"
              icon={TrendingUp}
              iconBg="bg-[#0ecb81]/10"
              iconColor="text-[#0ecb81]"
              onClick={() => nav('/orders')}
            />
            <ActionRow
              label="Portfolio"
              desc="Holdings and performance"
              icon={BadgeCheck}
              iconBg="bg-purple-500/10"
              iconColor="text-purple-400"
              onClick={() => nav('/portfolio')}
            />
            <ActionRow
              label="Account statement"
              desc="Download transaction history"
              icon={BookOpen}
              iconBg="bg-orange-500/10"
              iconColor="text-orange-400"
              onClick={() => nav('/reports')}
            />
          </Card>

          {/* ── Sign out ─────────────────────────────────────────────── */}
          <div className="mt-3 mb-2">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-[#f6465d]/20 bg-[#f6465d]/5 py-4 text-sm font-bold text-[#f6465d] transition hover:bg-[#f6465d]/10"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-4 py-4">
            <button className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition">Privacy Policy</button>
            <span className="text-muted-foreground/20 text-xs">·</span>
            <button className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition">Terms of Use</button>
            <span className="text-muted-foreground/20 text-xs">·</span>
            <span className="text-[10px] text-muted-foreground/25">v1.0.0</span>
          </div>

        </div>
      </div>
    </div>
  )
}
