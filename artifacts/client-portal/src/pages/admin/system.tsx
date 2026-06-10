import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Radio, TestTube2, Activity, CheckCircle2, XCircle, Wifi, WifiOff } from 'lucide-react'
import AdminLayout, { StatCard } from '@/components/admin-layout'
import { adminApi } from '@/lib/api'

export default function AdminSystem() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-mode'],
    queryFn:  () => adminApi.getMode(),
    refetchInterval: 5_000,
  })

  const { data: metricsData } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn:  () => adminApi.metrics(),
    refetchInterval: 30_000,
  })

  const modeMut = useMutation({
    mutationFn: (mode: 'demo' | 'live') => adminApi.setMode(mode),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-mode'] }),
  })

  const isLive = data?.mode === 'live'
  const c = metricsData?.clients as Record<string, number> | undefined
  const o = metricsData?.orders  as Record<string, number> | undefined

  return (
    <AdminLayout title="System" subtitle="Trading mode, FIX session, and platform health">
      <div className="space-y-6 max-w-2xl">
        {/* Trading Mode */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-bold text-foreground mb-1">Trading Mode</h2>
          <p className="text-xs text-muted-foreground mb-5">
            Switching to Live connects to NGX ATS via FIX 4.4 and routes real orders. Demo simulates fills locally.
          </p>

          {isLoading ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => modeMut.mutate('demo')}
                disabled={modeMut.isPending || !isLive}
                className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${
                  !isLive
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-border hover:border-emerald-500/50 opacity-60 hover:opacity-100'
                }`}>
                <TestTube2 className={`w-6 h-6 ${!isLive ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-bold ${!isLive ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                  DEMO
                </span>
                <span className="text-[10px] text-muted-foreground text-center px-2">
                  Simulated fills · No real orders
                </span>
                {!isLive && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                    ACTIVE
                  </span>
                )}
              </button>

              <button
                onClick={() => modeMut.mutate('live')}
                disabled={modeMut.isPending || isLive}
                className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${
                  isLive
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-border hover:border-orange-500/50 opacity-60 hover:opacity-100'
                }`}>
                <Radio className={`w-6 h-6 ${isLive ? 'text-orange-400 animate-pulse' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-bold ${isLive ? 'text-orange-400' : 'text-muted-foreground'}`}>
                  LIVE
                </span>
                <span className="text-[10px] text-muted-foreground text-center px-2">
                  Real NGX ATS orders via FIX 4.4
                </span>
                {isLive && (
                  <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold">
                    ACTIVE
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* FIX Session Status */}
        {isLive && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-bold text-foreground mb-4">FIX 4.4 Session — NGX ATS</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                {data?.fixConnected
                  ? <Wifi    className="w-5 h-5 text-emerald-400" />
                  : <WifiOff className="w-5 h-5 text-red-400" />
                }
                <div>
                  <p className="text-xs font-medium text-foreground">TCP Connection</p>
                  <p className={`text-[10px] ${data?.fixConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                    {data?.fixConnected ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {data?.fixLoggedOn
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  : <XCircle      className="w-5 h-5 text-red-400" />
                }
                <div>
                  <p className="text-xs font-medium text-foreground">FIX Logon</p>
                  <p className={`text-[10px] ${data?.fixLoggedOn ? 'text-emerald-400' : 'text-red-400'}`}>
                    {data?.fixLoggedOn ? 'Session Active' : 'Not Logged On'}
                  </p>
                </div>
              </div>
            </div>

            {!data?.fixConnected && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-xs text-amber-300 leading-relaxed">
                  FIX session is not connected. Set <code className="font-mono bg-background px-1 rounded">FIX_HOST</code>,&nbsp;
                  <code className="font-mono bg-background px-1 rounded">FIX_PORT</code>,&nbsp;
                  <code className="font-mono bg-background px-1 rounded">FIX_SENDER_COMP_ID</code>,&nbsp;
                  and <code className="font-mono bg-background px-1 rounded">FIX_PASSWORD</code> environment variables,
                  then switch back to Demo and re-activate Live mode.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Platform Health */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Platform Health (Last 24h)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Clients"  value={c?.total_clients  ?? 0} />
            <StatCard label="Verified KYC"   value={c?.verified_clients ?? 0} color="green" />
            <StatCard label="Orders Today"   value={o?.total_orders ?? 0} />
            <StatCard label="Active Orders"  value={o?.active_orders ?? 0} color="blue" />
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
