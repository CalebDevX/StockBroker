import { useAuth } from '@/contexts/AuthContext'
import { Settings2, ShieldCheck, Bell, User, Lock } from 'lucide-react'
import DashboardSidebar from '@/components/dashboard-sidebar'

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 md:ml-56 overflow-auto pb-24 md:pb-0">
        <div className="p-4 md:p-8">
          <div className="mb-8 rounded-[2rem] border border-[#0ecb81]/15 bg-gradient-to-br from-[#0b0e11] via-[#121820]/70 to-[#111821] p-8 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.65)] backdrop-blur-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-[#0ecb81]/80">Account settings</p>
                <h1 className="mt-3 text-3xl md:text-4xl font-bold text-foreground">Personalize your portal</h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Manage your account details, security preferences, and notification settings from one secure page.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-3xl border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-4 py-3 text-sm font-semibold text-[#0ecb81]">
                <Settings2 className="w-4 h-4" /> Preferences
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
              <h2 className="text-xl font-semibold text-foreground">Profile</h2>
              <p className="mt-2 text-sm text-muted-foreground">Review and update your account details.</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-3xl border border-[#0ecb81]/10 bg-[#111821]/80 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#0ecb81]/80">Full name</p>
                  <p className="mt-2 text-sm text-foreground">{user?.fullName ?? '—'}</p>
                </div>
                <div className="rounded-3xl border border-[#0ecb81]/10 bg-[#111821]/80 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#0ecb81]/80">Email address</p>
                  <p className="mt-2 text-sm text-foreground">{user?.email ?? '—'}</p>
                </div>
                <div className="rounded-3xl border border-[#0ecb81]/10 bg-[#111821]/80 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#0ecb81]/80">Trading role</p>
                  <p className="mt-2 text-sm text-foreground">{user?.role ?? 'Client'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
              <h2 className="text-xl font-semibold text-foreground">Security</h2>
              <p className="mt-2 text-sm text-muted-foreground">Protect your account with modern security controls.</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-3xl border border-[#0ecb81]/10 bg-[#111821]/80 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Two-factor authentication</p>
                      <p className="mt-1 text-sm text-muted-foreground">Enhance account security with an additional verification step.</p>
                    </div>
                    <span className="rounded-full bg-[#0ecb81]/10 px-3 py-1 text-xs font-semibold text-[#0ecb81]">Enabled</span>
                  </div>
                </div>
                <div className="rounded-3xl border border-[#0ecb81]/10 bg-[#111821]/80 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Password management</p>
                      <p className="mt-1 text-sm text-muted-foreground">Reset your password or update account credentials.</p>
                    </div>
                    <button className="rounded-2xl border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-3 py-2 text-xs font-semibold text-[#0ecb81] transition hover:bg-[#0ecb81]/15">
                      Change password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-[#0ecb81]" />
              <div>
                <h2 className="text-xl font-semibold text-foreground">Notification preferences</h2>
                <p className="mt-2 text-sm text-muted-foreground">Choose which portal updates and alerts you receive.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-[#0ecb81]/10 bg-[#111821]/80 p-4">
                <p className="text-sm font-semibold text-foreground">Trade alerts</p>
                <p className="mt-2 text-sm text-muted-foreground">Price movements and order execution notifications.</p>
              </div>
              <div className="rounded-3xl border border-[#0ecb81]/10 bg-[#111821]/80 p-4">
                <p className="text-sm font-semibold text-foreground">Account updates</p>
                <p className="mt-2 text-sm text-muted-foreground">Deposit, withdrawal, and verification alerts.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
