import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'wouter'
import { Eye, EyeOff, AlertCircle, CheckCircle2, User, Mail, Lock, Phone, ShieldCheck, RotateCcw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { authApi } from '@/lib/api'
import PhoneInput, { COUNTRIES, buildFullPhone, isValidPhone, type Country } from './phone-input'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2045C17.64 8.5663 17.5827 7.9527 17.4764 7.3636H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.2045Z" fill="#4285F4"/>
      <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
      <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.5931 3.68182 9C3.68182 8.4068 3.78409 7.83 3.96409 7.29V4.9581H0.957275C0.347727 6.1731 0 7.5477 0 9C0 10.4522 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
      <path d="M9 3.5795C10.3214 3.5795 11.5077 4.0336 12.4405 4.9254L15.0218 2.344C13.4632 0.8918 11.4259 0 9 0C5.48182 0 2.43818 2.0168 0.957275 4.9581L3.96409 7.29C4.67182 5.1627 6.65591 3.5795 9 3.5795Z" fill="#EA4335"/>
    </svg>
  )
}

const inp = 'w-full px-4 py-4 bg-background border rounded-xl text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-base'
const lbl = 'block text-sm font-medium text-foreground mb-2'

function isEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) }
function looksLikePhone(v: string) {
  const stripped = v.replace(/[\s\-().]/g, '')
  return /^[+0][\d]{6,}$/.test(stripped)
}

const DEFAULT_COUNTRY = COUNTRIES[0]

type RegMethod = 'email' | 'phone'

export default function AuthCard() {
  const [, navigate] = useLocation()
  const { login, register } = useAuth()
  const [tab, setTab] = useState<'login' | 'register'>('login')

  // Login
  const [loginId,    setLoginId]    = useState('')
  const [loginPw,    setLoginPw]    = useState('')
  const [showLoginPw, setShowLoginPw] = useState(false)
  const loginPwRef = useRef<HTMLInputElement>(null)

  // Register
  const [regMethod,  setRegMethod]  = useState<RegMethod>('email')
  const [fullName,   setFullName]   = useState('')
  const [email,      setEmail]      = useState('')
  const [dialCode,   setDialCode]   = useState(DEFAULT_COUNTRY.dial)
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY)
  const [localPhone, setLocalPhone] = useState('')
  const [password,   setPassword]   = useState('')
  const [showPw,     setShowPw]     = useState(false)

  // OTP
  const [otpStep,      setOtpStep]      = useState(false)
  const [otpRequestId, setOtpRequestId] = useState('')
  const [otpCode,      setOtpCode]      = useState('')
  const [otpLoading,   setOtpLoading]   = useState(false)
  const [otpError,     setOtpError]     = useState('')
  const [otpCountdown, setOtpCountdown] = useState(0)

  const [isLoading, setIsLoading] = useState(false)
  const [apiError,  setApiError]  = useState<{ message: string; type: 'email' | 'password' | 'general' } | null>(null)

  useEffect(() => {
    if (otpCountdown <= 0) return
    const t = setInterval(() => setOtpCountdown(v => Math.max(0, v - 1)), 1000)
    return () => clearInterval(t)
  }, [otpCountdown])

  function resetForm(t: 'login' | 'register') {
    setTab(t); setApiError(null); setOtpStep(false); setOtpCode(''); setOtpError('')
    setFullName(''); setEmail(''); setLocalPhone(''); setPassword(''); setRegMethod('email')
    setDialCode(DEFAULT_COUNTRY.dial); setSelectedCountry(DEFAULT_COUNTRY)
    setLoginId(''); setLoginPw('')
  }

  const loginIdIsPhone = looksLikePhone(loginId)
  const loginIdIsEmail = isEmail(loginId)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!loginId.trim() || !loginPw) return
    setIsLoading(true); setApiError(null)
    try {
      await login(loginId.trim(), loginPw)
      navigate('/dashboard')
    } catch (err) {
      const msg = (err as Error).message
      if (msg.toLowerCase().includes('password')) {
        setApiError({ message: msg, type: 'password' })
      } else if (msg.toLowerCase().includes('no account') || msg.toLowerCase().includes('not found')) {
        setApiError({ message: msg, type: 'email' })
      } else {
        setApiError({ message: msg, type: 'general' })
      }
    } finally { setIsLoading(false) }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setApiError(null)

    if (!fullName.trim() || fullName.trim().split(' ').filter(Boolean).length < 2) {
      setApiError({ message: 'Please enter your full name (first and last)', type: 'general' }); return
    }

    if (regMethod === 'email') {
      if (!isEmail(email)) { setApiError({ message: 'Enter a valid email address', type: 'email' }); return }
    } else {
      if (!isValidPhone(dialCode, localPhone)) {
        setApiError({ message: 'Enter a valid phone number', type: 'email' }); return
      }
    }

    if (password.length < 8) {
      setApiError({ message: 'Password must be at least 8 characters', type: 'password' }); return
    }

    const fullPhone = regMethod === 'phone' ? buildFullPhone(dialCode, localPhone) : ''
    const phoneForOtp = regMethod === 'phone' ? fullPhone : ''

    if (regMethod === 'phone') {
      setIsLoading(true)
      try {
        const result = await authApi.sendPhoneOtp(phoneForOtp)
        setOtpRequestId(result.requestId)
        setOtpCountdown(600)
        setOtpStep(true)
      } catch (err) {
        setApiError({ message: (err as Error).message, type: 'general' })
      } finally { setIsLoading(false) }
    } else {
      // Email registration — still require phone for OTP (use the phone field)
      if (!isValidPhone(dialCode, localPhone)) {
        setApiError({ message: 'Enter a valid phone number to receive your verification code', type: 'general' }); return
      }
      const phoneNum = buildFullPhone(dialCode, localPhone)
      setIsLoading(true)
      try {
        const result = await authApi.sendPhoneOtp(phoneNum)
        setOtpRequestId(result.requestId)
        setOtpCountdown(600)
        setOtpStep(true)
      } catch (err) {
        setApiError({ message: (err as Error).message, type: 'general' })
      } finally { setIsLoading(false) }
    }
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault()
    if (otpCode.length < 4) { setOtpError('Enter the verification code sent to your phone'); return }
    setOtpLoading(true); setOtpError('')
    try {
      await authApi.verifyPhoneOtp(otpRequestId, otpCode)
      const phoneNum = buildFullPhone(dialCode, localPhone)
      const emailVal = regMethod === 'email' ? email : `${phoneNum.replace(/\D/g, '')}@phone.ngx`
      await register({ email: emailVal, password, fullName: fullName.trim(), phone: phoneNum })
      navigate('/dashboard')
    } catch (err) {
      setOtpError((err as Error).message)
    } finally { setOtpLoading(false) }
  }

  async function resendOtp() {
    if (otpCountdown > 0) return
    const phoneNum = buildFullPhone(dialCode, localPhone)
    setOtpLoading(true); setOtpError('')
    try {
      const result = await authApi.sendPhoneOtp(phoneNum)
      setOtpRequestId(result.requestId)
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
        {apiError && !otpStep && (
          <div className={`mb-4 flex items-start gap-2.5 rounded-xl p-3.5 border ${
            apiError.type === 'password'
              ? 'bg-orange-500/10 border-orange-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${apiError.type === 'password' ? 'text-orange-400' : 'text-red-400'}`} />
            <div>
              <p className={`text-sm font-medium ${apiError.type === 'password' ? 'text-orange-300' : 'text-red-400'}`}>
                {apiError.message}
              </p>
              {apiError.type === 'password' && (
                <a href="/forgot-password" className="text-xs text-orange-400/70 hover:text-orange-300 underline mt-0.5 block transition-colors">
                  Forgot your password?
                </a>
              )}
              {apiError.type === 'email' && (
                <button
                  type="button"
                  onClick={() => resetForm('register')}
                  className="text-xs text-red-400/70 hover:text-red-300 underline mt-0.5 block transition-colors"
                >
                  Create an account instead
                </button>
              )}
            </div>
          </div>
        )}

        {/* Google sign-in */}
        {!otpStep && (
          <>
            <button
              type="button"
              onClick={() => { window.location.href = '/api/auth/google' }}
              className="w-full flex items-center justify-center gap-3 bg-card border border-border rounded-xl py-3.5 text-sm font-semibold text-foreground hover:bg-card/80 hover:border-primary/40 transition-all"
            >
              <GoogleIcon />
              Continue with Google
            </button>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </>
        )}

        {/* ── SIGN IN ─────────────────────────────────────────────────── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in-50 duration-200">
            <div>
              <label className={lbl}>Email or Phone number</label>
              <div className="relative">
                {loginIdIsPhone
                  ? <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  : <Mail  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                }
                <input
                  type="text"
                  placeholder="you@example.com or 08012345678"
                  value={loginId}
                  onChange={e => { setLoginId(e.target.value); setApiError(null) }}
                  onKeyDown={e => { if (e.key === 'Enter' && !loginPw) { e.preventDefault(); loginPwRef.current?.focus() } }}
                  className={`${inp} pl-11 ${
                    apiError?.type === 'email' ? 'border-red-500/60 focus:ring-red-500' : 'border-border'
                  }`}
                  autoComplete="username"
                  autoFocus
                  inputMode={loginIdIsPhone ? 'tel' : 'email'}
                />
                {loginIdIsEmail && (
                  <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0ecb81]" />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <a href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={loginPwRef}
                  type={showLoginPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={loginPw}
                  onChange={e => { setLoginPw(e.target.value); setApiError(null) }}
                  className={`${inp} pl-11 pr-12 ${
                    apiError?.type === 'password' ? 'border-orange-500/60 focus:ring-orange-500' : 'border-border'
                  }`}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowLoginPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showLoginPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !loginId.trim() || !loginPw}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl transition-all hover:bg-primary/90 active:scale-[0.98] text-base shadow-lg shadow-primary/20 disabled:opacity-60 mt-2"
            >
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

        {/* ── CREATE ACCOUNT ──────────────────────────────────────────── */}
        {tab === 'register' && !otpStep && (
          <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in-50 duration-200">

            {/* Method toggle */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Sign up with</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRegMethod('email')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    regMethod === 'email'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Mail className="w-4 h-4" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setRegMethod('phone')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    regMethod === 'phone'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Phone className="w-4 h-4" /> Phone
                </button>
              </div>
            </div>

            {/* Full name */}
            <div>
              <label className={lbl}>Full Name <span className="text-red-400">*</span></label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Chukwuemeka Okonkwo"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className={inp + ' pl-11 border-border'}
                  autoFocus
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email (shown when regMethod === 'email' OR always as supplemental) */}
            {regMethod === 'email' && (
              <div>
                <label className={lbl}>Email Address <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setApiError(null) }}
                    className={`${inp} pl-11 ${
                      email && !isEmail(email) ? 'border-red-500/60' : 'border-border'
                    }`}
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
                {email && !isEmail(email) && (
                  <p className="text-red-400 text-xs mt-1">Enter a valid email address</p>
                )}
              </div>
            )}

            {/* Phone number */}
            <div>
              <label className={lbl}>
                Phone Number <span className="text-red-400">*</span>
                {regMethod === 'email' && <span className="text-muted-foreground font-normal ml-1">(for verification)</span>}
              </label>
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

            {/* Password */}
            <div>
              <label className={lbl}>Password <span className="text-red-400">*</span></label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={inp + ' pl-11 pr-12 border-border'}
                  autoComplete="new-password"
                />
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Password strength: <span className="font-medium text-foreground">{pwStrength.label}</span>
                  </p>
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
              <a href="/terms" className="text-primary hover:underline">Terms of Service</a> and{' '}
              <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
            </p>
          </form>
        )}

        {/* ── OTP VERIFICATION ───────────────────────────────────────── */}
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
                className={inp + ' border-border text-center text-2xl font-bold tracking-[0.4em]'}
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
                className="text-muted-foreground hover:text-foreground transition-colors">
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
