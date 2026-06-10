import { useState, useEffect, useRef } from 'react'
import { Search, TrendingUp, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { marketApi, type InstrumentLite } from '@/lib/api'

export interface SelectedInstrument {
  symbol: string
  name: string
  price: number
}

interface InstrumentSearchProps {
  onSelect: (instrument: SelectedInstrument) => void
  selectedSymbol?: string
}

export default function InstrumentSearch({ onSelect, selectedSymbol }: InstrumentSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [query, setQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setQuery(searchTerm.trim()), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchTerm])

  // Initial full list (no min-length restriction)
  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: ['instruments-all'],
    queryFn: () => marketApi.instruments(100),
    staleTime: 5 * 60_000,
  })

  // Search results (only when query >= 2)
  const { data: searchData, isFetching: searchFetching } = useQuery({
    queryKey: ['instruments-search', query],
    queryFn: () => marketApi.search(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  })

  const isLoading = allLoading
  const isFetching = query.length >= 2 && searchFetching
  const instruments: InstrumentLite[] =
    query.length >= 2 ? (searchData?.instruments ?? []) : (allData?.instruments ?? [])

  return (
    <div className="h-full flex flex-col bg-card rounded-lg border border-border">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by symbol or company"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-3 w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading instruments…</span>
          </div>
        ) : instruments.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {query.length >= 2 ? 'No instruments found' : 'No instruments available'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {instruments.map((inst) => (
              <button
                key={inst.symbol}
                onClick={() => onSelect({ symbol: inst.symbol, name: inst.name, price: inst.lastPriceNaira })}
                disabled={inst.isTradingSuspended}
                className={`w-full px-4 py-3 text-left hover:bg-secondary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedSymbol === inst.symbol ? 'bg-primary/10 border-l-2 border-primary' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-foreground">{inst.symbol}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[130px]">{inst.name}</div>
                    {inst.isTradingSuspended && (
                      <div className="text-xs text-red-400 mt-0.5">Suspended</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-foreground text-sm">
                      ₦{Number(inst.lastPriceNaira).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center justify-end gap-1 mt-0.5">
                      <TrendingUp className="w-3 h-3" />
                      <span>{inst.sector?.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
