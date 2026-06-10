import { Switch, Route, Router as WouterRouter, Redirect } from 'wouter'
import AuthCard from '@/components/auth-card'
import DashboardPage from '@/pages/dashboard'
import TradePage from '@/pages/trade'
import OrdersPage from '@/pages/orders'
import PortfolioPage from '@/pages/portfolio'
import FundsPage from '@/pages/funds'
import ReportsPage from '@/pages/reports'
import NotificationsPage from '@/pages/notifications'
import HelpPage from '@/pages/help'
import SettingsPage from '@/pages/settings'
import KycPage from '@/pages/kyc'
import ForgotPasswordPage from '@/pages/forgot-password'
import AuthCallbackPage   from '@/pages/auth-callback'
import TermsPage from '@/pages/terms'
import PrivacyPage from '@/pages/privacy'
import AdminOverview    from '@/pages/admin/index'
import AdminClients     from '@/pages/admin/clients'
import AdminClientDetail from '@/pages/admin/client-detail'
import AdminKycQueue    from '@/pages/admin/kyc-queue'
import AdminOrders      from '@/pages/admin/orders'
import AdminInstruments from '@/pages/admin/instruments'
import AdminFunds       from '@/pages/admin/funds'
import AdminAudit       from '@/pages/admin/audit'
import AdminSettings    from '@/pages/admin/settings'
import AdminSystem      from '@/pages/admin/system'
import AdminSupport     from '@/pages/admin/support'
import AdminDeveloper   from '@/pages/admin/developer'
import { useAuth } from '@/contexts/AuthContext'
import MobileBottomNav from '@/components/mobile/MobileBottomNav'
import MoreDrawer from '@/components/mobile/MoreDrawer'
import TradeFAB from '@/components/mobile/TradeFAB'
import SupportChatWidget from '@/components/support-chat-widget'

const SPINNER = (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
)

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return SPINNER
  if (!user) return <Redirect to="/" />
  return <>{children}</>
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return SPINNER
  if (user) return <Redirect to="/dashboard" />
  return <>{children}</>
}

// Role-based guards for the admin panel
function RoleGuard({ children, roles, fallback = '/dashboard' }: {
  children: React.ReactNode; roles: string[]; fallback?: string
}) {
  const { user, isLoading } = useAuth()
  if (isLoading) return SPINNER
  if (!user) return <Redirect to="/" />
  if (!roles.includes(user.role)) return <Redirect to={fallback} />
  return <>{children}</>
}

// /admin overview — admin only; broker/compliance are redirected to their own landing pages
function AdminOverviewGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return SPINNER
  if (!user) return <Redirect to="/" />
  if (user.role === 'broker')     return <Redirect to="/admin/orders" />
  if (user.role === 'compliance') return <Redirect to="/admin/kyc" />
  if (user.role !== 'admin')      return <Redirect to="/dashboard" />
  return <>{children}</>
}

function AuthenticatedMobileUI() {
  const { user, isLoading } = useAuth()
  if (isLoading || !user) return null
  return <MobileBottomNav />
}

function ClientSupportWidget() {
  const { user, isLoading } = useAuth()
  if (isLoading || !user) return null
  return <SupportChatWidget />
}

export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, '') ?? ''}>
      <Switch>
        {/* Public */}
        <Route path="/">
          <GuestGuard><AuthCard /></GuestGuard>
        </Route>
        <Route path="/forgot-password"><ForgotPasswordPage /></Route>
        <Route path="/auth/callback"><AuthCallbackPage /></Route>
        <Route path="/terms"><TermsPage /></Route>
        <Route path="/privacy"><PrivacyPage /></Route>

        {/* Client portal */}
        <Route path="/dashboard">
          <AuthGuard><DashboardPage /></AuthGuard>
        </Route>
        <Route path="/kyc">
          <AuthGuard><KycPage /></AuthGuard>
        </Route>
        <Route path="/trade">
          <AuthGuard><TradePage /></AuthGuard>
        </Route>
        <Route path="/orders">
          <AuthGuard><OrdersPage /></AuthGuard>
        </Route>
        <Route path="/portfolio">
          <AuthGuard><PortfolioPage /></AuthGuard>
        </Route>
        <Route path="/reports">
          <AuthGuard><ReportsPage /></AuthGuard>
        </Route>
        <Route path="/notifications">
          <AuthGuard><NotificationsPage /></AuthGuard>
        </Route>
        <Route path="/help">
          <AuthGuard><HelpPage /></AuthGuard>
        </Route>
        <Route path="/settings">
          <AuthGuard><SettingsPage /></AuthGuard>
        </Route>
        <Route path="/funds">
          <AuthGuard><FundsPage /></AuthGuard>
        </Route>

        {/* Admin / Broker / Compliance panel */}
        <Route path="/admin">
          <AdminOverviewGuard><AdminOverview /></AdminOverviewGuard>
        </Route>
        <Route path="/admin/clients">
          <RoleGuard roles={['admin','broker','compliance']}><AdminClients /></RoleGuard>
        </Route>
        <Route path="/admin/clients/:id">
          <RoleGuard roles={['admin','broker','compliance']}><AdminClientDetail /></RoleGuard>
        </Route>
        <Route path="/admin/kyc">
          <RoleGuard roles={['admin','compliance']}><AdminKycQueue /></RoleGuard>
        </Route>
        <Route path="/admin/orders">
          <RoleGuard roles={['admin','broker']}><AdminOrders /></RoleGuard>
        </Route>
        <Route path="/admin/instruments">
          <RoleGuard roles={['admin']}><AdminInstruments /></RoleGuard>
        </Route>
        <Route path="/admin/funds">
          <RoleGuard roles={['admin']}><AdminFunds /></RoleGuard>
        </Route>
        <Route path="/admin/audit">
          <RoleGuard roles={['admin']}><AdminAudit /></RoleGuard>
        </Route>
        <Route path="/admin/settings">
          <RoleGuard roles={['admin']}><AdminSettings /></RoleGuard>
        </Route>
        <Route path="/admin/system">
          <RoleGuard roles={['admin']}><AdminSystem /></RoleGuard>
        </Route>
        <Route path="/admin/support">
          <RoleGuard roles={['admin']}><AdminSupport /></RoleGuard>
        </Route>
        <Route path="/admin/developer">
          <RoleGuard roles={['admin']}><AdminDeveloper /></RoleGuard>
        </Route>

        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
      <AuthenticatedMobileUI />
      <ClientSupportWidget />
    </WouterRouter>
  )
}
