import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'wouter'

export default function useMobileNav() {
  const [openMore, setOpenMore] = useState(false)
  const [location] = useLocation()

  useEffect(() => {
    // close drawer when route changes
    setOpenMore(false)
  }, [location])

  const close = useCallback(() => setOpenMore(false), [])
  const toggle = useCallback(() => setOpenMore(v => !v), [])

  return { openMore, setOpenMore, close, toggle }
}
