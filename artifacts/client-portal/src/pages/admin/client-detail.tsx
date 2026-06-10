import { useState } from 'react'
import { useRoute, Link } from 'wouter'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, UserX, UserCheck, ShieldCheck, ShieldX } from 'lucide-react'
import AdminLayout, { Badge, kycVariant, orderVariant } from '@/components/admin-layout'
import { adminApi, fmtKobo } from '@/lib/api'

export default function AdminClientDetail() {
  const [, params] = useRoute('/admin/clients/:id')
  const id = params?.id ?? ''
  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-client', id],
    queryFn:  () => adminApi.client(id),
    enabled:  !!id,
  })

  const [kycNote, setKycNote] = useState('')
  const [roleVal, setRoleVal] = useState('')

  const kycMut = useMutation({
    mutationFn: (status: 'verified' | 'rejected' | 'under_review') =>
      adminApi.updateKyc(id, { kycStatus: status, kycTier: status === 'verified' ? 'tier2' : undefined, notes: kycNote }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-client', id] }); setKycNote('') },
  })

  const suspendMut = useMutation({
    mutationFn: (isSuspended: boolean) => adminApi.suspendClient(id, { isSuspended }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-client', id] }),
  })

  const roleMut = useMutation({
    mutationFn: (role: string) => adminApi.changeRole(id, { role }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-client', id] }); setRoleVal('') },
  })

  if (isLoading) return (
    <AdminLayout title="Client Detail">
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </AdminLayout>
  )

  if (error || !data) return (
    <AdminLayout title="Client Detail">
      <p className="text-red-400 text-sm">Failed to load client</p>
    </AdminLayout>
  )

  const { client, orderStats, recentOrders, positions, recentTransactions } = data
  const stats = orderStats as Record<string, number>

  return (
    <AdminLayout
      title={client.fullName}
      subtitle={client.email}
      actions={
        <Link href="/admin/clients" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-3.5 h-3.5" /> All Clients
        </Link>
      }
    >
      <div className="space-y-6">
        {/* Header badges */}
        <div className="flex flex-wrap gap-2 items-center">
          <Badge label={client.kycStatus} variant={kycVariant(client.kycStatus)} />
          <Badge label={client.kycTier}   variant="blue" />
          <Badge label={client.role}      variant={client.role === 'client' ? 'gray' : 'blue'} />
          {client.isSuspended && <Badge label="Suspended" variant="red" />}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Account Info */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-3">Account Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Full Name',    client.fullName],
                  ['Email',        client.email],
                  ['Phone',        client.phone],
                  ['Broker Code',  (client as any).brokerCode],
                  ['CHN',          client.chn ?? '—'],
                  ['Cash Balance', fmtKobo(client.cashBalanceKobo)],
                  ['Last Login',   client.lastLoginAt ? new Date(client.lastLoginAt).toLocaleString('en-NG') : 'Never'],
                  ['Joined',       new Date(client.createdAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-xs font-medium text-foreground truncate">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* KYC Data */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-3">KYC & Identity</h3>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                {[
                  ['BVN', client.bvn ? `••••••••${client.bvn.slice(-3)}` : 'Not submitted'],
                  ['NIN', client.nin ? `••••••••${client.nin.slice(-3)}` : 'Not submitted'],
                  ['KYC Status', client.kycStatus],
                  ['KYC Tier',   client.kycTier],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-xs font-medium text-foreground">{val}</p>
                  </div>
                ))}
              </div>

              {/* KYC Actions */}
              <div className="space-y-2 pt-3 border-t border-border">
                <input
                  value={kycNote} onChange={e => setKycNote(e.target.value)}
                  placeholder="Add review note (optional)…"
                  className="w-full px-3 py-2 text-xs bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <button onClick={() => kycMut.mutate('verified')} disabled={kycMut.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 text-xs font-semibold transition-all disabled:opacity-50">
                    <ShieldCheck className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => kycMut.mutate('under_review')} disabled={kycMut.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 text-xs font-semibold transition-all disabled:opacity-50">
                    Under Review
                  </button>
                  <button onClick={() => kycMut.mutate('rejected')} disabled={kycMut.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 text-xs font-semibold transition-all disabled:opacity-50">
                    <ShieldX className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            </div>

            {/* Orders */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="text-sm font-bold text-foreground">
                  Recent Orders
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    {stats?.total ?? 0} total · {stats?.filled ?? 0} filled · {stats?.active ?? 0} active
                  </span>
                </h3>
              </div>
              <div className="divide-y divide-border">
                {recentOrders.length === 0 && (
                  <p className="text-xs text-muted-foreground p-4">No orders yet</p>
                )}
                {recentOrders.map((o: any) => (
                  <div key={o.orderId as string} className="px-5 py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{o.symbol as string}</span>
                        <Badge label={o.side as string} variant={(o.side as string) === 'buy' ? 'green' : 'red'} />
                        <Badge label={o.status as string} variant={orderVariant(o.status as string)} />
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {(o.quantity as number).toLocaleString()} units
                    </div>
                    <div className="text-right text-xs text-muted-foreground w-20 shrink-0">
                      {new Date(o.createdAt as string).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — Actions */}
          <div className="space-y-4">
            {/* Suspend */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-bold text-foreground mb-3">Account Control</h3>
              <button
                onClick={() => suspendMut.mutate(!client.isSuspended)}
                disabled={suspendMut.isPending}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 ${
                  client.isSuspended
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25'
                }`}>
                {client.isSuspended ? <><UserCheck className="w-3.5 h-3.5" /> Unsuspend Account</> : <><UserX className="w-3.5 h-3.5" /> Suspend Account</>}
              </button>
            </div>

            {/* Change Role */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-bold text-foreground mb-3">Role</h3>
              <p className="text-xs text-muted-foreground mb-2">Current: <strong className="text-foreground">{client.role}</strong></p>
              <select
                value={roleVal} onChange={e => setRoleVal(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-2">
                <option value="">Select new role…</option>
                {['client','broker','compliance','admin'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                onClick={() => roleVal && roleMut.mutate(roleVal)}
                disabled={!roleVal || roleMut.isPending}
                className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all">
                Change Role
              </button>
            </div>

            {/* Positions summary */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-bold text-foreground mb-3">Portfolio ({positions.length} positions)</h3>
              {positions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No open positions</p>
              ) : (
                <div className="space-y-2">
                  {positions.slice(0, 5).map((p: Record<string, unknown>) => (
                    <div key={p.symbol as string} className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">{p.symbol as string}</span>
                      <span className="text-xs text-muted-foreground">{(p.quantity as number).toLocaleString()} units</span>
                    </div>
                  ))}
                  {positions.length > 5 && (
                    <p className="text-[10px] text-muted-foreground">+{positions.length - 5} more</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
