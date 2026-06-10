import { useState, useRef } from 'react'
import { useLocation } from 'wouter'
import { Eye, EyeOff, AlertCircle, User, Mail, Phone, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { authApi } from '@/lib/api'

const inp = 'w-full px-4 py-4 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-base'
const lbl = 'block text-sm font-medium text-foreground mb-2'

function isEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) }
function isPhone(v: string) { return /^0[789][01]\d{8}$/.test(v.replace(/\s/g, '')) }

export default function AuthCard() {
  const [, navigate] = useLocation()
  const { login, register } = useAuth()
  const [tab, setTab] = useState<'login' | 'register'>('login')

  // Login
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPw,    setLoginPw]    = useState('')
  const [showLoginPw, setShowLoginPw] = useState(false)

  // Register
  const [fullName,  setFullName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [phone,     setPhone]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPw,    setShowPw]    = useState(false)

  const loginPwRef = useRef<HTMLInputElement>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [apiError,  setApiError]  = useState('')

  function resetForm(t: 'login' | 'register') {
    setTab(t); setApiError('')
    setFullName(''); setEmail(''); setPhone(''); setPassword('')
    setLoginEmail(''); setLoginPw('')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!loginEmail || !loginPw) return
    setIsLoading(true); setApiError('')
    try {
      await login(loginEmail, loginPw)
      navigate('/dashboard')
    } catch (err) {
      setApiError((err as Error).message)
    } finally { setIsLoading(false) }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setApiError('')
    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      setApiError('Please enter your full name (first and last)'); return
    }
    if (!isEmail(email)) { setApiError('Enter a valid email address'); return }
    if (!isPhone(phone)) { setApiError('Enter a valid Nigerian phone number'); return }
    if (password.length < 8) { setApiError('Password must be at least 8 characters'); return }
    setIsLoading(true)
    try {
      await register({ email, password, fullName: fullName.trim(), phone: phone.replace(/\s/g, '') })
      navigate('/dashboard')
    } catch (err) {
      setApiError((err as Error).message)
    } finally { setIsLoading(false) }
  }

  const pwStrength = (() => {
    if (!password) return null
    let score = 0
    if (password.length >= 8)  score++
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    if (score <= 1) return { label: 'Weak',   color: 'bg-red-500',    w: '25%'  }
    if (score <= 2) return { label: 'Fair',   color: 'bg-yellow-500', w: '50%'  }
    if (score <= 3) return { label: 'Good',   color: 'bg-blue-500',   w: '75%'  }
    return              { label: 'Strong', color: 'bg-emerald-500', w: '100%' }
  })()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-background">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
          <defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
          </pattern></defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
        </svg>
      </div>

      <div className="w-full max-w-sm z-10 py-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-black text-sm">SB</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-none">StockBroker NG</h1>
            <p className="text-muted-foreground text-xs">Nigerian Exchange — NGX</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 bg-card p-1 rounded-xl border border-border">
          {(['login', 'register'] as const).map(t => (
            <button key={t} onClick={() => resetForm(t)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === t ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {apiError && (
          <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">{apiError}</p>
          </div>
        )}

        {/* ── LOGIN ── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in-50 duration-200">
            <div>
              <label className={lbl}>Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" placeholder="you@example.com"
                  value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !loginPw) { e.preventDefault(); loginPwRef.current?.focus() } }}
                  className={inp + ' pl-11'} autoComplete="email" autoFocus />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <a href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-accent transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input ref={loginPwRef} type={showLoginPw ? 'text' : 'password'} placeholder="••••••••"
                  value={loginPw} onChange={e => setLoginPw(e.target.value)}
                  className={inp + ' pl-11 pr-12'} autoComplete="current-password" />
                <button type="button" onClick={() => setShowLoginPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showLoginPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading || !loginEmail || !loginPw}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl transition-all hover:bg-primary/90 active:scale-[0.98] text-base shadow-lg shadow-primary/20 disabled:opacity-60 mt-2">
              {isLoading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Signing in…
                  </span>
                : 'Sign In'
              }
            </button>

          </form>
        )}

        {/* ── REGISTER ── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Full Name */ }
            <div>
              <label className={lbl}>Full Name <span className="text-red-400">*</span></label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder="Chukwuemeka Okonkwo"
                  value={fullName} onChange={e => setFullName(e.target.value)}
                  className={inp + ' pl-11'} autoFocus autoComplete="name" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={lbl}>Email Address <span className="text-red-400">*</span></label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className={inp + ' pl-11'} autoComplete="email" inputMode="email" />
              </div>
              {email && !isEmail(email) && (
                <p className="text-red-400 text-xs mt-1">Enter a valid email address</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className={lbl}>Phone Number <span className="text-red-400">*</span></label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium select-none">🇳🇬</span>
                <input type="tel" placeholder="0801 234 5678"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  className={inp + ' pl-10'} inputMode="tel" autoComplete="tel" />
              </div>
              {phone && !isPhone(phone) && (
                <p className="text-red-400 text-xs mt-1">Use format: 0801 234 5678</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className={lbl}>Password <span className="text-red-400">*</span></label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showPw ? 'text' : 'password'} placeholder="At least 8 characters"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className={inp + ' pl-11 pr-12'} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && pwStrength && (
                <div className="mt-2">
                  <div className="h-1 bg-border rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${pwStrength.color}`}
                      style={{ width: pwStrength.w }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Strength: <span className="font-medium text-foreground">{pwStrength.label}</span></p>
                </div>
              )}
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl transition-all hover:bg-primary/90 active:scale-[0.98] text-base shadow-lg shadow-primary/20 disabled:opacity-60">
              {isLoading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Creating account…
                  </span>
                : 'Create My Account'
              }
            </button>

            <p className="text-center text-xs text-muted-foreground pt-1 pb-2">
              By creating an account you agree to our{' '}
              <a href="/terms" className="text-accent hover:underline">Terms of Service</a> and{' '}
              <a href="/privacy" className="text-accent hover:underline">Privacy Policy</a>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
