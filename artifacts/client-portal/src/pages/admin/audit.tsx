import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import AdminLayout from '@/components/admin-layout'
import { adminApi, type AuditLogEntry } from '@/lib/api'

const ACTION_FILTERS = [
  { label: 'All',        value: '' },
  { label: 'KYC',        value: 'kyc' },
  { label: 'Orders',     value: 'order' },
  { label: 'Clients',    value: 'client' },
  { label: 'Auth',       value: 'auth' },
]

function actionColor(action: string) {
  if (action.includes('kyc'))     return 'text-blue-400 bg-blue-500/10'
  if (action.includes('order'))   return 'text-amber-400 bg-amber-500/10'
  if (action.includes('suspend')) return 'text-red-400 bg-red-500/10'
  if (action.includes('login'))   return 'text-emerald-400 bg-emerald-500/10'
  return 'text-muted-foreground bg-secondary/20'
}

function DetailsExpander({ details }: { details: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false)
  if (!details) return null
  return (
    <div>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Details
      </button>
      {open && (
        <pre className="mt-1.5 p-2 bg-background border border-border rounded-lg text-[10px] text-muted-foreground overflow-x-auto max-w-xs">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default function AdminAudit() {
  const [action,   setAction]   = useState('')
  const [page,     setPage]     = useState(0)
  const LIMIT = 50

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', action, page],
    queryFn:  () => adminApi.auditLog({ action: action || undefined, limit: LIMIT, offset: page * LIMIT }),
  } as any)

  const logs: AuditLogEntry[] = (data as any)?.logs ?? []

  return (
    <AdminLayout title="Audit Log" subtitle="Full compliance audit trail">
      <div className="flex gap-2 mb-4 flex-wrap">
        {ACTION_FILTERS.map(f => (
          <button key={f.value} onClick={() => { setAction(f.value); setPage(0) }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              action === f.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No audit entries found</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    {['Time','Actor','Action','Entity','IP','Details'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: AuditLogEntry) => (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-secondary/10 transition-colors align-top">
                      <td className="px-4 py-2.5 text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'medium' })}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-medium text-foreground truncate max-w-[120px]">
                          {log.actorName ?? 'System'}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                          {log.actorId?.slice(0, 8)}…
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-medium ${actionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[10px] text-muted-foreground">
                        <p>{log.entityType}</p>
                        <p className="font-mono">{log.entityId?.slice(0, 8)}…</p>
                      </td>
                      <td className="px-4 py-2.5 text-[10px] text-muted-foreground font-mono">
                        {log.ipAddress ?? '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <DetailsExpander details={log.details} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">{logs.length} entries</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-3 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:bg-secondary/20 text-foreground">
                  Previous
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={((data as any)?.count ?? 0) < LIMIT}
                  className="px-3 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:bg-secondary/20 text-foreground">
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
