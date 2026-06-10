import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'

export function useOrderStream() {
  const qc = useQueryClient()
  const { token } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!token) return

    function connect() {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${proto}//${window.location.host}/api/ws?token=${token}`)
      wsRef.current = ws

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as { type: string }
          if (msg.type === 'ORDER_UPDATE' || msg.type === 'ORDER_FILLED') {
            qc.invalidateQueries({ queryKey: ['orders'] })
            qc.invalidateQueries({ queryKey: ['portfolio-summary'] })
            qc.invalidateQueries({ queryKey: ['holdings'] })
          }
        } catch { /* ignore */ }
      }

      ws.onclose = () => {
        reconnectRef.current = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      wsRef.current?.close()
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
    }
  }, [token, qc])
}
