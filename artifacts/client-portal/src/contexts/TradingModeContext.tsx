import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export type TradingMode = 'demo' | 'live'

interface TradingModeState {
  mode:         TradingMode
  fixConnected: boolean
  fixLoggedOn:  boolean
  isLoading:    boolean
  refresh:      () => void
}

const Ctx = createContext<TradingModeState>({
  mode: 'demo', fixConnected: false, fixLoggedOn: false, isLoading: true,
  refresh: () => {},
})

export function TradingModeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<TradingModeState, 'refresh'>>({
    mode: 'demo', fixConnected: false, fixLoggedOn: false, isLoading: true,
  })

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/system/mode')
      if (res.ok) {
        const data = await res.json() as { mode: TradingMode; fixConnected: boolean; fixLoggedOn: boolean }
        setState({ mode: data.mode, fixConnected: data.fixConnected, fixLoggedOn: data.fixLoggedOn, isLoading: false })
      }
    } catch {
      setState(s => ({ ...s, isLoading: false }))
    }
  }, [])

  useEffect(() => {
    void refresh()
    const t = setInterval(() => { void refresh() }, 30_000)
    return () => clearInterval(t)
  }, [refresh])

  return <Ctx.Provider value={{ ...state, refresh }}>{children}</Ctx.Provider>
}

export function useTradingMode() { return useContext(Ctx) }
