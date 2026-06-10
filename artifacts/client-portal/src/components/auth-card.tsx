import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'wouter'
import { Eye, EyeOff, AlertCircle, User, Mail, Lock, ShieldCheck, RotateCcw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { authApi } from '@/lib/api'
import PhoneInput, { COUNTRIES, buildFullPhone, isValidPhone, type Country } from './phone-input'

const inp = 'w-full px-4 py-4 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-base'
const lbl = 'block text-sm font-medium text-foreground mb-2'

function isEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) }

const DEFAULT_COUNTRY = COUNTRIES[0]

export default function AuthCard() {
  const [, navigate] = useLocation()
  const { login, register } = useAuth()
  const [tab, setTab] = useState<'login' | 'register'>('login')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPw,    setLoginPw]    = useState('')
  const [showLoginPw, setShowLoginPw] = useState(false)

  const [fullName,  setFullName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [dialCode,  setDialCode]  = useState(DEFAULT_COUNTRY.dial)
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY)
  const [localPhone, setLocalPhone] = useState('')
  const [password,  setPassword]  = useState('')
  const [showPw,    setShowPw]    = useState(false)

  const [otpStep,      setOtpStep]      = useState(false)
  const [otpRequestId, setOtpRequestId] = useState('')
  const [otpCode,      setOtpCode]      = useState('')
  const [otpLoading,   setOtpLoading]   = useState(false)
  const [otpError,     setOtpError]     = useState('')
  const [otpExpiry,    setOtpExpiry]    = useState<Date | null>(null)
  const [otpCountdown, setOtpCountdown] = useState(0)

  const loginPwRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [apiError,  setApiError]  = useState('')

  useEffect(() => {
    if (otpCountdown <= 0) return
    const t = setInterval(() => setOtpCountdown(v => Math.max(0, v - 1)), 1000)
    return () => clearInterval(t)
  }, [otpCountdown])

  function resetForm(t: 'login' | 'register') {
    setTab(t); setApiError(''); setOtpStep(false); setOtpCode(''); setOtpError('')
    setFullName(''); setEmail(''); setLocalPhone(''); setPassword('')
    setDialCode(DEFAULT_COUNTRY.dial); setSelectedCountry(DEFAULT_COUNTRY)
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
    if (!isValidPhone(dialCode, localPhone)) {
      setApiError('Enter a valid phone number'); return
    }
    if (password.length < 8) { setApiError('Password must be at least 8 characters'); return }

    const fullPhone = buildFullPhone(dialCode, localPhone)
    setIsLoading(true)
    try {
      const result = await authApi.sendPhoneOtp(fullPhone)
      setOtpRequestId(result.requestId)
      setOtpExpiry(new Date(result.expiresAt))
      setOtpCountdown(600)
      setOtpStep(true)
    } catch (err) {
      setApiError((err as Error).message)
    } finally { setIsLoading(false) }
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault()
    if (otpCode.length < 4) { setOtpError('Enter the code sent to your phone'); return }
    setOtpLoading(true); setOtpError('')
    try {
      await authApi.verifyPhoneOtp(otpRequestId, otpCode)
      const fullPhone = buildFullPhone(dialCode, localPhone)
      await register({ email, password, fullName: fullName.trim(), phone: fullPhone })
      navigate('/dashboard')
    } catch (err) {
      setOtpError((err as Error).message)
    } finally { setOtpLoading(false) }
  }

  async function resendOtp() {
    if (otpCountdown > 0) return
    const fullPhone = buildFullPhone(dialCode, localPhone)
    setOtpLoading(true); setOtpError('')
    try {
      const result = await authApi.sendPhoneOtp(fullPhone)
      setOtpRequestId(result.requestId)
      setOtpExpiry(new Date(result.expiresAt))
      setOtpCountdown(600)
      setOtpCode('')
    } catch (err) {
      setOtpError((err as Error).message)
    } finally { setOtpLoading(false) }
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

  const countdown = `${Math.floor(otpCountdown / 60)}:${String(otpCountdown % 60).padStart(2, '0')}`
  const fullPhone  = buildFullPhone(dialCode, localPhone)

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
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-black text-sm">SB</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-none">StockBroker NG</h1>
            <p className="text-muted-foreground text-xs">Nigerian Exchange — NGX</p>
          </div>
        </div>

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

        {apiError && !otpStep && (
          <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">{apiError}</p>
          </div>
        )}

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
                <a href="/forgot-password" className="text-xs text-muted-foreground hover:text-accent transition-colors">
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

        {tab === 'register' && !otpStep && (
          <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in-50 duration-200">
            <div>
              <label className={lbl}>Full Name <span className="text-red-400">*</span></label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder="Chukwuemeka Okonkwo"
                  value={fullName} onChange={e => setFullName(e.target.value)}
                  className={inp + ' pl-11'} autoFocus autoComplete="name" />
              </div>
            </div>

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

            <div>
              <label className={lbl}>Phone Number <span className="text-red-400">*</span></label>
              <PhoneInput
                localValue={localPhone}
                dialCode={dialCode}
                onLocalChange={setLocalPhone}
                onCountryChange={(c) => { setSelectedCountry(c); setDialCode(c.dial) }}
                error={!!(localPhone && !isValidPhone(dialCode, localPhone))}
              />
              {localPhone && !isValidPhone(dialCode, localPhone) && (
                <p className="text-red-400 text-xs mt-1">
                  {dialCode === '+234' ? 'Use format: 0801 234 5678' : 'Enter a valid phone number'}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                A verification code will be sent to this number
              </p>
            </div>

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
                    Sending code…
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

        {tab === 'register' && otpStep && (
          <form onSubmit={handleOtpVerify} className="space-y-5 animate-in fade-in-50 duration-200">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Verify your number</h2>
              <p className="text-sm text-muted-foreground mt-1">
                We sent a 6-digit code to{' '}
                <span className="font-semibold text-foreground">{fullPhone}</span>
              </p>
            </div>

            {otpError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{otpError}</p>
              </div>
            )}

            <div>
              <label className={lbl}>Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                placeholder="123456"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className={inp + ' text-center text-2xl font-bold tracking-[0.4em]'}
                autoFocus
              />
            </div>

            <button type="submit" disabled={otpLoading || otpCode.length < 4}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl transition-all hover:bg-primary/90 active:scale-[0.98] text-base shadow-lg shadow-primary/20 disabled:opacity-60">
              {otpLoading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Verifying…
                  </span>
                : 'Verify & Create Account'
              }
            </button>

            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => { setOtpStep(false); setOtpCode(''); setOtpError('') }}
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                ← Back
              </button>
              <button type="button" onClick={resendOtp} disabled={otpCountdown > 0 || otpLoading}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <RotateCcw className="w-3.5 h-3.5" />
                {otpCountdown > 0 ? `Resend in ${countdown}` : 'Resend code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
