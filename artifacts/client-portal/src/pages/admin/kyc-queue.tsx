import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, ShieldX, Clock, ChevronRight } from 'lucide-react'
import { Link } from 'wouter'
import AdminLayout, { Badge } from '@/components/admin-layout'
import { adminApi } from '@/lib/api'

export default function AdminKycQueue() {
  const qc = useQueryClient()
  const [notes, setNotes] = useState<Record<string, string>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['admin-kyc-queue'],
    queryFn:  () => adminApi.kycQueue(),
    refetchInterval: 15_000,
  })

  const kycMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'verified' | 'rejected' | 'under_review' }) =>
      adminApi.updateKyc(id, {
        kycStatus: status,
        kycTier:   status === 'verified' ? 'tier2' : undefined,
        notes:     notes[id],
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-kyc-queue'] }),
  })

  const queue = data?.queue ?? []

  return (
    <AdminLayout
      title="KYC Review Queue"
      subtitle={`${data?.count ?? 0} pending submission${(data?.count ?? 0) !== 1 ? 's' : ''}`}
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-foreground">All caught up!</p>
          <p className="text-xs text-muted-foreground mt-1">No pending KYC submissions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((client: Record<string, string>) => (
            <div key={client.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {client.fullName.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-foreground">{client.fullName}</h3>
                    <Badge
                      label={client.kycStatus}
                      variant={client.kycStatus === 'under_review' ? 'amber' : 'gray'}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{client.email} · {client.phone}</p>

                  {/* Identity info */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">BVN</p>
                      <p className="text-xs font-mono text-foreground">
                        {client.bvn ? `••••••••${client.bvn.slice(-3)}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">NIN</p>
                      <p className="text-xs font-mono text-foreground">
                        {client.nin ? `••••••••${client.nin.slice(-3)}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Submitted</p>
                      <p className="text-xs text-foreground">
                        {new Date(client.updatedAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Account age</p>
                      <p className="text-xs text-foreground">
                        {Math.floor((Date.now() - new Date(client.createdAt).getTime()) / 86400000)}d
                      </p>
                    </div>
                  </div>

                  {/* Review note */}
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input
                      value={notes[client.id] ?? ''}
                      onChange={e => setNotes(n => ({ ...n, [client.id]: e.target.value }))}
                      placeholder="Add review note (optional)…"
                      className="flex-1 px-3 py-2 text-xs bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => kycMut.mutate({ id: client.id, status: 'verified' })}
                        disabled={kycMut.isPending}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 text-xs font-semibold transition-all disabled:opacity-50">
                        <ShieldCheck className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => kycMut.mutate({ id: client.id, status: 'under_review' })}
                        disabled={kycMut.isPending}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 text-xs font-semibold transition-all disabled:opacity-50">
                        <Clock className="w-3.5 h-3.5" /> Review
                      </button>
                      <button
                        onClick={() => kycMut.mutate({ id: client.id, status: 'rejected' })}
                        disabled={kycMut.isPending}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 text-xs font-semibold transition-all disabled:opacity-50">
                        <ShieldX className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                </div>

                <Link href={`/admin/clients/${client.id}`}
                  className="p-1.5 rounded-lg hover:bg-secondary/30 text-muted-foreground shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
