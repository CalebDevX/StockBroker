import { useState } from 'react'
import { useLocation } from 'wouter'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react'
import { authApi } from '@/lib/api'

const inp = 'w-full px-4 py-4 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-base'
const lbl = 'block text-sm font-medium text-foreground mb-2'

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation()
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email')

  const [email, setEmail]       = useState('')
  const [token, setToken]       = useState('')
  const [newPw, setNewPw]       = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [showCpw, setShowCpw]   = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]       = useState('')
  const [devToken, setDevToken] = useState('')

  const pwStrength = (() => {
    if (!newPw) return null
    let s = 0
    if (newPw.length >= 8)  s++
    if (newPw.length >= 12) s++
    if (/[A-Z]/.test(newPw)) s++
    if (/[0-9]/.test(newPw)) s++
    if (/[^A-Za-z0-9]/.test(newPw)) s++
    if (s <= 1) return { label: 'Weak',   color: 'bg-red-500',    w: '25%'  }
    if (s <= 2) return { label: 'Fair',   color: 'bg-yellow-500', w: '50%'  }
    if (s <= 3) return { label: 'Good',   color: 'bg-blue-500',   w: '75%'  }
    return              { label: 'Strong', color: 'bg-emerald-500', w: '100%' }
  })()

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setIsLoading(true); setError('')
    try {
      const res = await authApi.forgotPassword(email)
      if (res.devToken) setDevToken(res.devToken)
      setStep('reset')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally { setIsLoading(false) }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) { setError('Enter the reset token from your email'); return }
    if (newPw.length < 8) { setError('Password must be at least 8 characters'); return }
    if (newPw !== confirmPw) { setError('Passwords do not match'); return }
    setIsLoading(true); setError('')
    try {
      await authApi.resetPassword(token.trim(), newPw)
      setStep('done')
    } catch (err) {
      setError((err as Error).message)
    } finally { setIsLoading(false) }
  }

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

        {step === 'email' && (
          <div className="animate-in fade-in-50 duration-200">
            <h2 className="text-xl font-bold text-foreground mb-1">Reset password</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Enter your registered email and we'll send a reset link.
            </p>

            {error && (
              <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSendLink} className="space-y-4">
              <div>
                <label className={lbl}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="email" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className={inp + ' pl-11'} autoComplete="email" autoFocus />
                </div>
              </div>
              <button type="submit" disabled={isLoading || !email}
                className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl transition-all hover:bg-primary/90 active:scale-[0.98] text-base shadow-lg shadow-primary/20 disabled:opacity-60">
                {isLoading
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Sending…
                    </span>
                  : 'Send Reset Link'
                }
              </button>
            </form>

            <button onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-6 mx-auto">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </button>
          </div>
        )}

        {step === 'reset' && (
          <div className="animate-in fade-in-50 duration-200">
            <h2 className="text-xl font-bold text-foreground mb-1">New password</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Enter the token from your email, then choose a new password.
            </p>

            {devToken && (
              <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                <p className="text-amber-400 text-xs font-mono break-all">
                  <span className="font-sans font-semibold text-amber-300 block mb-0.5">Dev token (email not configured):</span>
                  {devToken}
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className={lbl}>Reset Token</label>
                <input type="text" placeholder="Paste token from email"
                  value={token} onChange={e => setToken(e.target.value)}
                  className={inp} autoComplete="off" autoFocus />
              </div>

              <div>
                <label className={lbl}>New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type={showPw ? 'text' : 'password'} placeholder="At least 8 characters"
                    value={newPw} onChange={e => setNewPw(e.target.value)}
                    className={inp + ' pl-11 pr-12'} autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {newPw && pwStrength && (
                  <div className="mt-2">
                    <div className="h-1 bg-border rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${pwStrength.color}`}
                        style={{ width: pwStrength.w }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Strength: <span className="font-medium text-foreground">{pwStrength.label}</span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className={lbl}>Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type={showCpw ? 'text' : 'password'} placeholder="Repeat your password"
                    value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                    className={inp + ' pl-11 pr-12'} autoComplete="new-password" />
                  <button type="button" onClick={() => setShowCpw(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showCpw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPw && newPw !== confirmPw && (
                  <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                )}
              </div>

              <button type="submit" disabled={isLoading || !token || !newPw || !confirmPw}
                className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl transition-all hover:bg-primary/90 active:scale-[0.98] text-base shadow-lg shadow-primary/20 disabled:opacity-60">
                {isLoading
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Resetting…
                    </span>
                  : 'Set New Password'
                }
              </button>
            </form>
          </div>
        )}

        {step === 'done' && (
          <div className="animate-in fade-in-50 duration-200 text-center">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Password updated</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Your password has been reset. Sign in with your new credentials.
            </p>
            <button onClick={() => navigate('/')}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl transition-all hover:bg-primary/90 active:scale-[0.98] text-base shadow-lg shadow-primary/20">
              Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
