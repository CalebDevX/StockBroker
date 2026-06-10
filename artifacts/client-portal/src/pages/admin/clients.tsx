import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'wouter'
import { Search, ChevronRight, UserX, UserCheck, ShieldCheck } from 'lucide-react'
import AdminLayout, { Badge, kycVariant } from '@/components/admin-layout'
import { adminApi, fmtKobo, type AdminClientRow } from '@/lib/api'

const FILTERS = [
  { label: 'All',         kycStatus: undefined, suspended: undefined },
  { label: 'Pending KYC', kycStatus: 'pending' as const,      suspended: undefined },
  { label: 'Under Review',kycStatus: 'under_review' as const,  suspended: undefined },
  { label: 'Verified',    kycStatus: 'verified' as const,      suspended: undefined },
  { label: 'Suspended',   kycStatus: undefined, suspended: true },
]

export default function AdminClients() {
  const [search,    setSearch]    = useState('')
  const [filterIdx, setFilterIdx] = useState(0)
  const qc = useQueryClient()

  const filter = FILTERS[filterIdx]!

  const { data, isLoading } = useQuery({
    queryKey: ['admin-clients', search, filterIdx],
    queryFn:  () => adminApi.clients({ search: search || undefined, ...filter }),
  } as any)

  const suspendMut = useMutation({
    mutationFn: ({ id, isSuspended }: { id: string; isSuspended: boolean }) =>
      adminApi.suspendClient(id, { isSuspended }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-clients'] }),
  })

  const clients = (data as any)?.clients ?? []

  return (
    <AdminLayout title="Clients" subtitle={`${(data as any)?.count ?? 0} client${((data as any)?.count ?? 0) !== 1 ? 's' : ''}`}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map((f, i) => (
            <button key={f.label} onClick={() => setFilterIdx(i)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                filterIdx === i
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No clients found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">KYC</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Balance</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Joined</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c: AdminClientRow) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/10 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground text-xs">{c.fullName}</p>
                      <p className="text-[10px] text-muted-foreground">{c.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={c.kycStatus} variant={kycVariant(c.kycStatus)} />
                      {c.bvn && <p className="text-[10px] text-muted-foreground mt-0.5">BVN ✓</p>}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-foreground">
                      {fmtKobo(c.cashBalanceKobo)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge label={c.role} variant={c.role === 'client' ? 'gray' : 'blue'} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      {c.isSuspended
                        ? <Badge label="Suspended" variant="red" />
                        : <Badge label="Active" variant="green" />
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => suspendMut.mutate({ id: c.id, isSuspended: !c.isSuspended })}
                          title={c.isSuspended ? 'Unsuspend' : 'Suspend'}
                          className="p-1.5 rounded-lg hover:bg-secondary/30 text-muted-foreground hover:text-foreground transition-colors">
                          {c.isSuspended
                            ? <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                            : <UserX    className="w-3.5 h-3.5 text-red-400" />
                          }
                        </button>
                        <Link href={`/admin/clients/${c.id}`}
                          className="p-1.5 rounded-lg hover:bg-secondary/30 text-muted-foreground hover:text-foreground transition-colors">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
