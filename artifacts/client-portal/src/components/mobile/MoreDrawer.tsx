import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'wouter'
import useMobileNav from './useMobileNav'
import { Settings, FileText, CreditCard, HelpCircle, Users, X } from 'lucide-react'

function focusableElements(container: HTMLElement | null) {
  if (!container) return [] as HTMLElement[]
  const els = Array.from(
    container.querySelectorAll<HTMLElement>(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    )
  )
  return els.filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true')
}

export default function MoreDrawer() {
  const { openMore, close } = useMobileNav()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const [announce, setAnnounce] = useState('')

  useEffect(() => {
    if (!openMore) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    // move focus into drawer
    const els = focusableElements(containerRef.current)
    if (els.length) els[0].focus()
    setAnnounce('More menu opened')

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        setAnnounce('More menu closed')
      }
      if (e.key === 'Tab') {
        const focusables = focusableElements(containerRef.current)
        if (focusables.length === 0) return
        const idx = focusables.indexOf(document.activeElement as HTMLElement)
        if (e.shiftKey && idx === 0) {
          e.preventDefault()
          focusables[focusables.length - 1].focus()
        } else if (!e.shiftKey && idx === focusables.length - 1) {
          e.preventDefault()
          focusables[0].focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      // restore focus
      if (previouslyFocused.current) previouslyFocused.current.focus()
      setAnnounce('')
    }
  }, [openMore, close])

  if (!openMore) return null

  return (
    <div className="fixed inset-0 z-50" aria-hidden={openMore ? 'false' : 'true'}>
      <div className="absolute inset-0 bg-black/40" onClick={() => { close(); setAnnounce('More menu closed') }} />
      <div
        id="more-drawer"
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="More navigation"
        className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-xl p-4 shadow-xl"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">More</h3>
          <button aria-label="Close more menu" onClick={() => { close(); setAnnounce('More menu closed') }} className="p-2 rounded hover:bg-muted">
            <X />
          </button>
        </div>
        <div className="grid gap-3">
          <Link href="/funds"><a className="flex items-center gap-3 p-3 rounded hover:bg-muted"> <CreditCard /> Funds</a></Link>
          <Link href="/kyc"><a className="flex items-center gap-3 p-3 rounded hover:bg-muted"> <Users /> KYC</a></Link>
          <Link href="/reports"><a className="flex items-center gap-3 p-3 rounded hover:bg-muted"> <FileText /> Reports</a></Link>
          <Link href="/help"><a className="flex items-center gap-3 p-3 rounded hover:bg-muted"> <HelpCircle /> Help</a></Link>
          <Link href="/settings"><a className="flex items-center gap-3 p-3 rounded hover:bg-muted"> <Settings /> Settings</a></Link>
        </div>
        <div aria-live="polite" role="status" className="sr-only">{announce}</div>
      </div>
    </div>
  )
}
