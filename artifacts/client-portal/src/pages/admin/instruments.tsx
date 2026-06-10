import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, PauseCircle, PlayCircle, Pencil } from 'lucide-react'
import AdminLayout, { Badge } from '@/components/admin-layout'
import { adminApi, fmtKobo, type AdminInstrument } from '@/lib/api'

function AddForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [f, setF] = useState({ symbol: '', name: '', sector: '', lastPriceNaira: '', isin: '' })
  const mut = useMutation({
    mutationFn: () => adminApi.createInstrument({
      symbol:         f.symbol, name: f.name, sector: f.sector || undefined,
      isin:           f.isin || undefined,
      lastPriceNaira: parseFloat(f.lastPriceNaira),
      isActive:       true,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-instruments'] }); onClose() },
  })

  const inp = 'w-full px-3 py-2 text-sm bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary'

  return (
    <div className="bg-card border border-primary/30 rounded-xl p-5 mb-4">
      <h3 className="text-sm font-bold text-foreground mb-4">Add / Update Instrument</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Symbol *</label>
          <input value={f.symbol} onChange={e => setF({...f, symbol: e.target.value.toUpperCase()})}
            placeholder="e.g. DANGCEM" className={inp} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">ISIN</label>
          <input value={f.isin} onChange={e => setF({...f, isin: e.target.value})}
            placeholder="e.g. NGDANGCEM" className={inp} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-muted-foreground mb-1">Company Name *</label>
          <input value={f.name} onChange={e => setF({...f, name: e.target.value})}
            placeholder="e.g. Dangote Cement PLC" className={inp} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Sector</label>
          <input value={f.sector} onChange={e => setF({...f, sector: e.target.value})}
            placeholder="e.g. Industrial Goods" className={inp} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Last Price (₦) *</label>
          <input type="number" value={f.lastPriceNaira} onChange={e => setF({...f, lastPriceNaira: e.target.value})}
            placeholder="e.g. 450.50" className={inp} />
        </div>
      </div>
      {mut.isError && (
        <p className="text-xs text-red-400 mb-2">{(mut.error as Error).message}</p>
      )}
      <div className="flex gap-2">
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !f.symbol || !f.name || !f.lastPriceNaira}
          className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all">
          {mut.isPending ? 'Saving…' : 'Save Instrument'}
        </button>
        <button onClick={onClose} className="px-4 py-2 border border-border text-muted-foreground text-xs rounded-lg hover:bg-secondary/20">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function AdminInstruments() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editPrice, setEditPrice] = useState<{ symbol: string; val: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-instruments'],
    queryFn:  () => adminApi.instruments(),
  })

  const toggleMut = useMutation({
    mutationFn: ({ symbol, isTradingSuspended }: { symbol: string; isTradingSuspended: boolean }) =>
      adminApi.updateInstrument(symbol, { isTradingSuspended }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-instruments'] }),
  })

  const priceMut = useMutation({
    mutationFn: ({ symbol, price }: { symbol: string; price: number }) =>
      adminApi.updateInstrument(symbol, { lastPriceNaira: price }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-instruments'] }); setEditPrice(null) },
  })

  const instruments: AdminInstrument[] = data?.instruments ?? []

  return (
    <AdminLayout
      title="Market Instruments"
      subtitle={`${instruments.length} instruments`}
      actions={
        <button onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all">
          <Plus className="w-3.5 h-3.5" /> Add Instrument
        </button>
      }
    >
      {showAdd && <AddForm onClose={() => setShowAdd(false)} />}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  {['Symbol','Name','Sector','Last Price','Change','Volume','Status','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {instruments.map((ins: AdminInstrument) => {
                  const change = ins.prevClosePriceKobo > 0
                    ? ((ins.lastPriceKobo - ins.prevClosePriceKobo) / ins.prevClosePriceKobo * 100)
                    : 0
                  return (
                    <tr key={ins.symbol} className="border-b border-border/50 hover:bg-secondary/10 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-foreground text-xs">{ins.symbol}</td>
                      <td className="px-4 py-2.5 text-xs text-foreground max-w-[160px] truncate">{ins.name}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{ins.sector ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        {editPrice?.symbol === ins.symbol ? (
                          <div className="flex gap-1.5 items-center">
                            <input
                              type="number" value={editPrice.val}
                              onChange={e => setEditPrice({ symbol: ins.symbol, val: e.target.value })}
                              className="w-24 px-2 py-1 text-xs bg-input border border-primary rounded text-foreground focus:outline-none"
                              autoFocus
                            />
                            <button onClick={() => priceMut.mutate({ symbol: ins.symbol, price: parseFloat(editPrice.val) })}
                              disabled={priceMut.isPending}
                              className="px-2 py-1 bg-primary text-primary-foreground text-[10px] rounded font-bold disabled:opacity-50">
                              ✓
                            </button>
                            <button onClick={() => setEditPrice(null)} className="text-muted-foreground text-xs">✕</button>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-foreground">{fmtKobo(ins.lastPriceKobo)}</span>
                        )}
                      </td>
                      <td className={`px-4 py-2.5 text-xs font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {ins.volume.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          {!ins.isActive && <Badge label="Inactive" variant="gray" />}
                          {ins.isTradingSuspended && <Badge label="Suspended" variant="red" />}
                          {ins.isActive && !ins.isTradingSuspended && <Badge label="Active" variant="green" />}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditPrice({ symbol: ins.symbol, val: String(ins.lastPriceKobo / 100) })}
                            title="Edit price"
                            className="p-1.5 rounded hover:bg-secondary/30 text-muted-foreground transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleMut.mutate({ symbol: ins.symbol, isTradingSuspended: !ins.isTradingSuspended })}
                            title={ins.isTradingSuspended ? 'Resume trading' : 'Suspend trading'}
                            className="p-1.5 rounded hover:bg-secondary/30 transition-colors">
                            {ins.isTradingSuspended
                              ? <PlayCircle  className="w-3.5 h-3.5 text-emerald-400" />
                              : <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
