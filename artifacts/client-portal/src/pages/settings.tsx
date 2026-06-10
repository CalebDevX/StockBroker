import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from 'wouter'
import {
  User, ShieldCheck, Bell, BadgeCheck,
  ChevronRight, LogOut, Lock, Key, FileText,
} from 'lucide-react'
import DashboardSidebar from '@/components/dashboard-sidebar'
import { KycStatusBadge } from '@/components/kyc-banner'

type Tab = 'Profile' | 'Security' | 'Notifications' | 'KYC'
const TABS: Tab[] = ['Profile', 'Security', 'Notifications', 'KYC']
const TAB_ICONS: Record<Tab, React.ElementType> = {
  Profile:       User,
  Security:      ShieldCheck,
  Notifications: Bell,
  KYC:           BadgeCheck,
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function ProfileTab({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [, nav] = useLocation()
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        <InfoRow label="Full name"      value={user?.fullName ?? '—'} />
        <InfoRow label="Email"          value={user?.email    ?? '—'} />
        <InfoRow label="Role"           value={user?.role     ?? 'Client'} />
        <InfoRow label="Account ID"     value={user?.id ? `#${String(user.id).padStart(6, '0')}` : '—'} />
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        <ActionRow
          label="Download account statement"
          icon={FileText}
          onClick={() => nav('/reports')}
        />
        <ActionRow
          label="View KYC verification"
          icon={ChevronRight}
          onClick={() => nav('/kyc')}
        />
        <ActionRow
          label="Fund account"
          icon={ChevronRight}
          onClick={() => nav('/funds')}
        />
      </div>

      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#f6465d]/25 bg-[#f6465d]/5 p-3.5 text-sm font-semibold text-[#f6465d] transition hover:bg-[#f6465d]/10"
      >
        <LogOut className="w-4 h-4" /> Sign out
      </button>
    </div>
  )
}

function SecurityTab() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0ecb81]/10 flex items-center justify-center shrink-0">
              <Key className="w-4 h-4 text-[#0ecb81]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Password</p>
              <p className="text-xs text-muted-foreground mt-0.5">Update your login credentials</p>
            </div>
          </div>
          <button className="rounded-lg border border-[#0ecb81]/25 bg-[#0ecb81]/10 px-3 py-1.5 text-xs font-semibold text-[#0ecb81] hover:bg-[#0ecb81]/15 transition">
            Change
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0ecb81]/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#0ecb81]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Two-factor authentication</p>
              <p className="text-xs text-muted-foreground mt-0.5">Second layer on sign-in</p>
            </div>
          </div>
          <span className="rounded-full bg-[#0ecb81]/10 px-2.5 py-1 text-xs font-semibold text-[#0ecb81]">
            Enabled
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0ecb81]/10 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-[#0ecb81]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Active sessions</p>
              <p className="text-xs text-muted-foreground mt-0.5">This device · Current session</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-[#0ecb81]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0ecb81]" /> Live
          </span>
        </div>
      </div>
    </div>
  )
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    tradeFills:  true,
    priceAlerts: true,
    deposits:    true,
    kycUpdates:  true,
    marketNews:  false,
  })
  const toggle = (k: keyof typeof prefs) =>
    setPrefs(p => ({ ...p, [k]: !p[k] }))

  const items: { key: keyof typeof prefs; label: string; desc: string }[] = [
    { key: 'tradeFills',  label: 'Trade fills',          desc: 'When a buy or sell order is executed' },
    { key: 'priceAlerts', label: 'Price alerts',          desc: 'Significant moves in your holdings'  },
    { key: 'deposits',    label: 'Deposits & withdrawals',desc: 'Fund activity on your account'       },
    { key: 'kycUpdates',  label: 'KYC status',            desc: 'Verification updates from compliance'},
    { key: 'marketNews',  label: 'Market news',           desc: 'NGX announcements & corporate actions'},
  ]

  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border">
      {items.map(({ key, label, desc }) => (
        <div key={key} className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
          <button
            onClick={() => toggle(key)}
            aria-label={`Toggle ${label}`}
            className={`relative w-10 h-[22px] rounded-full transition-colors shrink-0 ${prefs[key] ? 'bg-[#0ecb81]' : 'bg-muted/60'}`}
          >
            <span className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${prefs[key] ? 'translate-x-[18px]' : ''}`} />
          </button>
        </div>
      ))}
    </div>
  )
}

function KycTab({ user }: { user: any }) {
  const [, nav] = useLocation()
  const status: string = user?.kycStatus ?? 'unverified'

  const steps = [
    { label: 'Personal information',            done: true },
    { label: 'Identity document (NIN / passport)', done: status !== 'unverified' },
    { label: 'Proof of address',                done: status === 'approved' || status === 'pending' },
    { label: 'Broker review & approval',        done: status === 'approved' },
  ]

  const statusColor =
    status === 'approved'  ? 'text-[#0ecb81] bg-[#0ecb81]/10 border-[#0ecb81]/20' :
    status === 'pending'   ? 'text-[#f0b90b] bg-[#f0b90b]/10 border-[#f0b90b]/20' :
    status === 'rejected'  ? 'text-[#f6465d] bg-[#f6465d]/10 border-[#f6465d]/20' :
                             'text-muted-foreground bg-muted/30 border-border'

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Verification</p>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${statusColor}`}>
            {status}
          </span>
        </div>
        <div className="space-y-3">
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
      </div>

      {status !== 'approved' && (
        <button
          onClick={() => nav('/kyc')}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0ecb81] text-[#0b0e11] p-3.5 text-sm font-bold transition hover:bg-[#0ecb81]/90"
        >
          Continue verification <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right truncate max-w-[60%]">{value}</span>
    </div>
  )
}

function ActionRow({
  label, icon: Icon, onClick,
}: { label: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-[#0ecb81]/5 transition text-left"
    >
      <span className="text-sm text-foreground">{label}</span>
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  )
}

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('Profile')
  const avatarText = user?.fullName ? initials(user.fullName) : 'U'

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />

      <div className="flex-1 md:ml-56 flex flex-col pb-24 md:pb-0">

        {/* Profile header */}
        <div className="bg-gradient-to-b from-card to-background border-b border-border">
          <div className="flex flex-col items-center text-center px-6 pt-8 pb-0">
            <div className="w-16 h-16 rounded-full bg-[#0ecb81]/15 border border-[#0ecb81]/30 flex items-center justify-center mb-3">
              <span className="text-xl font-black text-[#0ecb81]">{avatarText}</span>
            </div>
            <h1 className="text-lg font-bold text-foreground">{user?.fullName ?? 'Account'}</h1>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">{user?.email}</p>
            <KycStatusBadge />
            <div className="h-5" />
          </div>

          {/* Tab bar */}
          <div className="flex border-t border-border">
            {TABS.map(tab => {
              const Icon = TAB_ICONS[tab]
              const active = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-wide transition-colors relative border-b-2 ${
                    active
                      ? 'text-[#0ecb81] border-[#0ecb81]'
                      : 'text-muted-foreground border-transparent hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 p-4 md:p-5 max-w-lg w-full mx-auto">
          {activeTab === 'Profile'       && <ProfileTab user={user} onLogout={logout} />}
          {activeTab === 'Security'      && <SecurityTab />}
          {activeTab === 'Notifications' && <NotificationsTab />}
          {activeTab === 'KYC'           && <KycTab user={user} />}
        </div>
      </div>
    </div>
  )
}
