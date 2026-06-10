import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export interface Country {
  code: string
  name: string
  dial: string
  flag: string
}

export const COUNTRIES: Country[] = [
  { code: 'NG', name: 'Nigeria',          dial: '+234', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana',            dial: '+233', flag: '🇬🇭' },
  { code: 'ZA', name: 'South Africa',     dial: '+27',  flag: '🇿🇦' },
  { code: 'KE', name: 'Kenya',            dial: '+254', flag: '🇰🇪' },
  { code: 'GB', name: 'United Kingdom',   dial: '+44',  flag: '🇬🇧' },
  { code: 'US', name: 'United States',    dial: '+1',   flag: '🇺🇸' },
  { code: 'CA', name: 'Canada',           dial: '+1',   flag: '🇨🇦' },
  { code: 'ET', name: 'Ethiopia',         dial: '+251', flag: '🇪🇹' },
  { code: 'EG', name: 'Egypt',            dial: '+20',  flag: '🇪🇬' },
  { code: 'TZ', name: 'Tanzania',         dial: '+255', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda',           dial: '+256', flag: '🇺🇬' },
  { code: 'RW', name: 'Rwanda',           dial: '+250', flag: '🇷🇼' },
  { code: 'CI', name: "Côte d'Ivoire",    dial: '+225', flag: '🇨🇮' },
  { code: 'SN', name: 'Senegal',          dial: '+221', flag: '🇸🇳' },
  { code: 'CM', name: 'Cameroon',         dial: '+237', flag: '🇨🇲' },
  { code: 'BJ', name: 'Benin',            dial: '+229', flag: '🇧🇯' },
  { code: 'TG', name: 'Togo',             dial: '+228', flag: '🇹🇬' },
  { code: 'ZM', name: 'Zambia',           dial: '+260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe',         dial: '+263', flag: '🇿🇼' },
  { code: 'MW', name: 'Malawi',           dial: '+265', flag: '🇲🇼' },
  { code: 'AO', name: 'Angola',           dial: '+244', flag: '🇦🇴' },
  { code: 'NA', name: 'Namibia',          dial: '+264', flag: '🇳🇦' },
  { code: 'BW', name: 'Botswana',         dial: '+267', flag: '🇧🇼' },
  { code: 'MA', name: 'Morocco',          dial: '+212', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algeria',          dial: '+213', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisia',          dial: '+216', flag: '🇹🇳' },
  { code: 'SD', name: 'Sudan',            dial: '+249', flag: '🇸🇩' },
  { code: 'MU', name: 'Mauritius',        dial: '+230', flag: '🇲🇺' },
  { code: 'DE', name: 'Germany',          dial: '+49',  flag: '🇩🇪' },
  { code: 'FR', name: 'France',           dial: '+33',  flag: '🇫🇷' },
  { code: 'IT', name: 'Italy',            dial: '+39',  flag: '🇮🇹' },
  { code: 'ES', name: 'Spain',            dial: '+34',  flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands',      dial: '+31',  flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden',           dial: '+46',  flag: '🇸🇪' },
  { code: 'IE', name: 'Ireland',          dial: '+353', flag: '🇮🇪' },
  { code: 'PT', name: 'Portugal',         dial: '+351', flag: '🇵🇹' },
  { code: 'BR', name: 'Brazil',           dial: '+55',  flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico',           dial: '+52',  flag: '🇲🇽' },
  { code: 'IN', name: 'India',            dial: '+91',  flag: '🇮🇳' },
  { code: 'CN', name: 'China',            dial: '+86',  flag: '🇨🇳' },
  { code: 'JP', name: 'Japan',            dial: '+81',  flag: '🇯🇵' },
  { code: 'AE', name: 'UAE',              dial: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia',     dial: '+966', flag: '🇸🇦' },
  { code: 'AU', name: 'Australia',        dial: '+61',  flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand',      dial: '+64',  flag: '🇳🇿' },
  { code: 'SG', name: 'Singapore',        dial: '+65',  flag: '🇸🇬' },
]

interface PhoneInputProps {
  localValue: string
  dialCode: string
  onLocalChange: (local: string) => void
  onCountryChange: (country: Country) => void
  placeholder?: string
  error?: boolean
}

export default function PhoneInput({
  localValue,
  dialCode,
  onLocalChange,
  onCountryChange,
  placeholder,
  error,
}: PhoneInputProps) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef    = useRef<HTMLInputElement>(null)

  const selected = COUNTRIES.find(c => c.dial === dialCode && c.code === COUNTRIES.find(x => x.dial === dialCode)?.code)
    ?? COUNTRIES.find(c => c.dial === dialCode)
    ?? COUNTRIES[0]

  const filtered = search.trim()
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dial.includes(search.replace(/\s/g, '')) ||
        c.code.toLowerCase().startsWith(search.toLowerCase())
      )
    : COUNTRIES

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 40)
  }, [open])

  function selectCountry(c: Country) {
    onCountryChange(c)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative">
      <div className={`flex bg-background border rounded-xl overflow-visible transition-all duration-150 ${
        error
          ? 'border-red-500/50 focus-within:ring-2 focus-within:ring-red-500/50'
          : 'border-border focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent'
      }`}>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-4 border-r transition-colors flex-shrink-0 select-none rounded-l-xl ${
            open ? 'bg-primary/10 border-primary/30' : 'bg-card/60 hover:bg-card border-border'
          }`}
        >
          <span className="text-[18px] leading-none">{selected.flag}</span>
          <span className="text-sm font-semibold text-foreground tabular-nums tracking-tight">{selected.dial}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </button>

        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={placeholder ?? (selected.code === 'NG' ? '0801 234 5678' : 'Phone number')}
          value={localValue}
          onChange={e => onLocalChange(e.target.value)}
          className="flex-1 px-4 py-4 bg-transparent text-foreground placeholder-muted-foreground/50 focus:outline-none text-base min-w-0"
        />
      </div>

      {open && (
        <div className="absolute z-[200] top-full mt-1.5 left-0 w-full min-w-[280px] bg-card border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search country or code…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">No country found</p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => selectCountry(c)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-primary/10 text-left ${
                    c.code === selected.code ? 'bg-primary/10 text-primary' : 'text-foreground'
                  }`}
                >
                  <span className="text-base w-6 text-center leading-none flex-shrink-0">{c.flag}</span>
                  <span className="flex-1 truncate font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">{c.dial}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function buildFullPhone(dialCode: string, local: string): string {
  const stripped = local.replace(/\s/g, '').replace(/^0/, '')
  return `${dialCode}${stripped}`
}

export function isValidPhone(dialCode: string, local: string): boolean {
  const digits = local.replace(/\D/g, '')
  if (dialCode === '+234') return /^0?[789][01]\d{8}$/.test(local.replace(/\s/g, ''))
  return digits.length >= 6 && digits.length <= 12
}
