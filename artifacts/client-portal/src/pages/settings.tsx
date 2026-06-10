import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLocation } from 'wouter'
import {
  User, ShieldCheck, Bell, BadgeCheck,
  ChevronRight, LogOut, Lock, Key,
} from 'lucide-react'
import DashboardSidebar from '@/components/dashboard-sidebar'
import { KycStatusBadge } from '@/components/kyc-banner'

type Tab = 'Profile' | 'Security' | 'Notifications' | 'KYC'
const TABS: Tab[] = ['Profile', 'Security', 'Notifications', 'KYC']
const TAB_ICONS: Record<Tab, React.ElementType> = {
  Profile: User,
  Security: ShieldCheck,
  Notifications: Bell,
  KYC: BadgeCheck,
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function ProfileTab({ user, onLogout }: { user: any; onLogout: () => void }) {
  return (
    <div className="space-y-3">
      <div className="rounded-[1.75rem] border border-[#0ecb81]/12 bg-[#0b0e11]/80 divide-y divide-border/40">
        <InfoRow label="Full name" value={user?.fullName ?? '—'} />
        <InfoRow label="Email address" value={user?.email ?? '—'} />
        <InfoRow label="Trading role" value={user?.role ?? 'Client'} />
        <InfoRow label="Account ID" value={user?.id ? `#${String(user.id).padStart(6, '0')}` : '—'} />
      </div>

      <div className="rounded-[1.75rem] border border-[#0ecb81]/12 bg-[#0b0e11]/80 divide-y divide-border/40">
        <ActionRow label="Edit profile" icon={ChevronRight} onClick={() => {}} />
        <ActionRow label="Download account statement" icon={ChevronRight} onClick={() => {}} />
      </div>

      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 rounded-[1.75rem] border border-[#f6465d]/20 bg-[#f6465d]/5 p-4 text-sm font-semibold text-[#f6465d] transition hover:bg-[#f6465d]/10"
      >
        <LogOut className="w-4 h-4" /> Sign out
      </button>
    </div>
  )
}

function SecurityTab() {
  return (
    <div className="space-y-3">
      <div className="rounded-[1.75rem] border border-[#0ecb81]/12 bg-[#0b0e11]/80 divide-y divide-border/40">
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0ecb81]/10 flex items-center justify-center">
              <Key className="w-4 h-4 text-[#0ecb81]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Password</p>
              <p className="text-xs text-muted-foreground mt-0.5">Last changed never</p>
            </div>
          </div>
          <button className="rounded-xl border border-[#0ecb81]/25 bg-[#0ecb81]/10 px-3 py-1.5 text-xs font-semibold text-[#0ecb81] hover:bg-[#0ecb81]/15 transition">
            Change
          </button>
        </div>
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0ecb81]/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#0ecb81]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Two-factor authentication</p>
              <p className="text-xs text-muted-foreground mt-0.5">Adds a second layer of security</p>
            </div>
          </div>
          <span className="rounded-full bg-[#0ecb81]/10 px-3 py-1 text-xs font-semibold text-[#0ecb81]">Enabled</span>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-[#0ecb81]/12 bg-[#0b0e11]/80 divide-y divide-border/40">
        <div className="flex items-center gap-3 p-4">
          <div className="w-9 h-9 rounded-xl bg-[#0ecb81]/10 flex items-center justify-center">
            <Lock className="w-4 h-4 text-[#0ecb81]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Active sessions</p>
            <p className="text-xs text-muted-foreground mt-0.5">This device · Current session</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-[#0ecb81]" />
        </div>
      </div>
    </div>
  )
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    tradeFills: true,
    priceAlerts: true,
    deposits: true,
    kycUpdates: true,
    marketNews: false,
  })
  const toggle = (k: keyof typeof prefs) => setPrefs(p => ({ ...p, [k]: !p[k] }))

  const items: { key: keyof typeof prefs; label: string; desc: string }[] = [
    { key: 'tradeFills',  label: 'Trade fills',      desc: 'When your buy or sell order is executed' },
    { key: 'priceAlerts', label: 'Price alerts',      desc: 'Significant moves in your holdings' },
    { key: 'deposits',    label: 'Deposits & withdrawals', desc: 'Fund activity on your account' },
    { key: 'kycUpdates',  label: 'KYC status',        desc: 'Verification approvals and requests' },
    { key: 'marketNews',  label: 'Market news',        desc: 'NGX announcements and corporate actions' },
  ]

  return (
    <div className="rounded-[1.75rem] border border-[#0ecb81]/12 bg-[#0b0e11]/80 divide-y divide-border/40">
      {items.map(({ key, label, desc }) => (
        <div key={key} className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
          <button
            onClick={() => toggle(key)}
            className={`relative w-11 h-6 rounded-full transition-colors ${prefs[key] ? 'bg-[#0ecb81]' : 'bg-muted/60'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${prefs[key] ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      ))}
    </div>
  )
}

function KycTab({ user }: { user: any }) {
  const [, navigate] = useLocation()
  const status: string = user?.kycStatus ?? 'unverified'

  const steps = [
    { label: 'Personal information', done: true },
    { label: 'Identity document (NIN / passport)', done: status !== 'unverified' },
    { label: 'Proof of address', done: status === 'approved' || status === 'pending' },
    { label: 'Broker review', done: status === 'approved' },
  ]

  return (
    <div className="space-y-3">
      <div className="rounded-[1.75rem] border border-[#0ecb81]/12 bg-[#0b0e11]/80 p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#0ecb81]/70 mb-1">Verification status</p>
            <KycStatusBadge />
          </div>
          <BadgeCheck className="w-8 h-8 text-[#0ecb81]/30" />
        </div>
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${s.done ? 'bg-[#0ecb81] text-[#0b0e11]' : 'border border-border text-muted-foreground'}`}>
                {s.done ? '✓' : i + 1}
              </div>
              <span className={`text-sm ${s.done ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {status !== 'approved' && (
        <button
          onClick={() => navigate('/kyc')}
          className="w-full flex items-center justify-center gap-2 rounded-[1.75rem] bg-[#0ecb81] text-[#0b0e11] p-4 text-sm font-bold transition hover:bg-[#0ecb81]/90"
        >
          Continue verification <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  )
}

function ActionRow({ label, icon: Icon, onClick }: { label: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between gap-4 p-4 hover:bg-white/[0.02] transition">
      <span className="text-sm text-foreground">{label}</span>
      <Icon className="w-4 h-4 text-muted-foreground" />
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
        <div className="bg-gradient-to-b from-[#0b0e11] via-[#0d1117] to-background">
          <div className="flex flex-col items-center text-center px-6 pt-8 pb-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0ecb81]/30 to-[#0ecb81]/10 border-2 border-[#0ecb81]/50 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(14,203,129,0.25)]">
              <span className="text-2xl font-black text-[#0ecb81]">{avatarText}</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">{user?.fullName ?? 'Account'}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
            <div className="mt-2 mb-5">
              <KycStatusBadge />
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-border/60 px-2">
            {TABS.map(tab => {
              const Icon = TAB_ICONS[tab]
              const active = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-wide transition-colors relative ${
                    active ? 'text-[#0ecb81]' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab}
                  {active && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[#0ecb81]" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 p-4 md:p-6 max-w-2xl w-full mx-auto">
          {activeTab === 'Profile'       && <ProfileTab user={user} onLogout={logout} />}
          {activeTab === 'Security'      && <SecurityTab />}
          {activeTab === 'Notifications' && <NotificationsTab />}
          {activeTab === 'KYC'           && <KycTab user={user} />}
        </div>
      </div>
    </div>
  )
}
