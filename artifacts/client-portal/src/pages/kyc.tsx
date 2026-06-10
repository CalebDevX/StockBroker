import { useState } from 'react'
import { useLocation } from 'wouter'
import { useMutation } from '@tanstack/react-query'
import {
  CheckCircle2, AlertCircle, ChevronRight, ChevronLeft,
  User, Shield, MapPin, BadgeCheck,
} from 'lucide-react'
import { authApi, type KycPayload } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import DashboardSidebar from '@/components/dashboard-sidebar'

const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT - Abuja','Gombe',
  'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos',
  'Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto',
  'Taraba','Yobe','Zamfara',
]

const inp = 'w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm'
const lbl = 'block text-sm font-medium text-foreground mb-1.5'

const STEPS = [
  { icon: User,     label: 'Personal',  desc: 'Date of birth & gender'     },
  { icon: Shield,   label: 'Identity',  desc: 'BVN & NIN verification'     },
  { icon: MapPin,   label: 'Address',   desc: 'Residential address'        },
]

export default function KycPage() {
  const [, navigate] = useLocation()
  const { refreshUser } = useAuth()
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')

  // Step 0 — Personal
  const [dob,    setDob]    = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('')

  // Step 1 — Identity
  const [bvn, setBvn] = useState('')
  const [nin, setNin] = useState('')

  // Step 2 — Address
  const [street,     setStreet]     = useState('')
  const [city,       setCity]       = useState('')
  const [state,      setState]      = useState('')
  const [lga,        setLga]        = useState('')
  const [postalCode, setPostalCode] = useState('')

  const mutation = useMutation({
    mutationFn: (payload: KycPayload) => authApi.submitKyc(payload),
    onSuccess: async () => {
      await refreshUser()
      navigate('/dashboard')
    },
    onError: (err) => setError((err as Error).message),
  })

  function validate(): string {
    if (step === 0) {
      if (!dob) return 'Please enter your date of birth'
      const age = new Date().getFullYear() - new Date(dob).getFullYear()
      if (age < 18) return 'You must be at least 18 years old'
      if (!gender) return 'Please select your gender'
    }
    if (step === 1) {
      if (!/^\d{11}$/.test(bvn)) return 'BVN must be exactly 11 digits'
      if (!/^\d{11}$/.test(nin)) return 'NIN must be exactly 11 digits'
    }
    if (step === 2) {
      if (!street.trim()) return 'Street address is required'
      if (!city.trim())   return 'City is required'
      if (!state)         return 'Please select your state'
      if (!lga.trim())    return 'LGA is required'
      if (!postalCode.trim()) return 'Postal code is required'
    }
    return ''
  }

  function handleNext() {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    if (step < 2) { setStep(s => s + 1); return }

    // Final step — submit
    mutation.mutate({
      dob,
      gender: gender as 'male' | 'female' | 'other',
      bvn,
      nin,
      address: { street: street.trim(), city: city.trim(), state, lga: lga.trim(), postalCode: postalCode.trim() },
    })
  }

  return (
    <div className="flex bg-background min-h-screen">
      <DashboardSidebar />
      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-lg">

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl mb-4">
              <BadgeCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Account Verification</h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
              Required by SEC Nigeria & CBN for all brokerage accounts. Takes 2 minutes.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 mb-8">
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-5 shadow-[0_20px_40px_-30px_rgba(14,203,129,0.6)]">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">Verification status</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">In progress</p>
              <p className="mt-2 text-sm text-muted-foreground">Your KYC submission is being reviewed by compliance.</p>
            </div>
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-5 shadow-[0_20px_40px_-30px_rgba(14,203,129,0.6)]">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0ecb81]/80">What to expect</p>
              <p className="mt-3 text-sm text-muted-foreground leading-6">Once approved, you will be able to trade live on NGX with full order capability and deposit/withdraw access.</p>
            </div>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-0 mb-8">
            {STEPS.map((s, i) => {
              const done    = i < step
              const current = i === step
              return (
                <div key={s.label} className="flex items-center flex-1">
                  <div className={`flex flex-col items-center flex-1 ${i < STEPS.length - 1 ? '' : ''}`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                      done    ? 'bg-primary border-primary' :
                      current ? 'border-primary bg-primary/10' :
                                'border-border bg-background'
                    }`}>
                      {done
                        ? <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                        : <s.icon className={`w-4 h-4 ${current ? 'text-primary' : 'text-muted-foreground'}`} />
                      }
                    </div>
                    <span className={`text-xs mt-1.5 font-medium hidden sm:block ${current ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 transition-all ${done ? 'bg-primary' : 'bg-border'}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Card */}
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground">{STEPS[step].label}</h2>
              <p className="text-sm text-muted-foreground">{STEPS[step].desc}</p>
            </div>

            {/* Error */}
            {(error || mutation.isError) && (
              <div className="mb-5 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error || (mutation.error as Error)?.message}</p>
              </div>
            )}

            {/* ── STEP 0: Personal ── */}
            {step === 0 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div>
                  <label className={lbl}>Date of Birth <span className="text-red-400">*</span></label>
                  <input type="date" value={dob} onChange={e => setDob(e.target.value)}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                    className={inp} />
                  <p className="text-xs text-muted-foreground mt-1">Must be 18 or older to open an account</p>
                </div>
                <div>
                  <label className={lbl}>Gender <span className="text-red-400">*</span></label>
                  <div className="flex gap-3">
                    {(['male', 'female', 'other'] as const).map(g => (
                      <button key={g} type="button" onClick={() => setGender(g)}
                        className={`flex-1 py-3 rounded-xl capitalize text-sm font-medium border transition-all ${
                          gender === g
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 text-xs text-muted-foreground leading-relaxed">
                  This information is required by the Securities and Exchange Commission (SEC) Nigeria for Know Your Customer (KYC) compliance.
                </div>
              </div>
            )}

            {/* ── STEP 1: Identity ── */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300 leading-relaxed">
                  <strong className="block mb-0.5">Why we need this</strong>
                  BVN and NIN are required by the Central Bank of Nigeria (CBN) and SEC for identity verification and fraud prevention on all brokerage accounts.
                </div>
                <div>
                  <label className={lbl}>Bank Verification Number (BVN) <span className="text-red-400">*</span></label>
                  <input type="text" inputMode="numeric" maxLength={11}
                    value={bvn} onChange={e => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="11-digit BVN" className={inp} />
                  <p className="text-xs text-muted-foreground mt-1">Dial *565*0# on any Nigerian network to retrieve your BVN</p>
                </div>
                <div>
                  <label className={lbl}>National Identification Number (NIN) <span className="text-red-400">*</span></label>
                  <input type="text" inputMode="numeric" maxLength={11}
                    value={nin} onChange={e => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="11-digit NIN" className={inp} />
                  <p className="text-xs text-muted-foreground mt-1">Dial *346# to get your NIN via USSD</p>
                </div>
                {bvn.length === 11 && nin.length === 11 && (
                  <div className="flex items-center gap-2 text-emerald-400 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Both numbers look valid
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: Address ── */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div>
                  <label className={lbl}>Street Address <span className="text-red-400">*</span></label>
                  <input type="text" value={street} onChange={e => setStreet(e.target.value)}
                    placeholder="e.g. 5 Marina Street, Victoria Island" className={inp} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>City <span className="text-red-400">*</span></label>
                    <input type="text" value={city} onChange={e => setCity(e.target.value)}
                      placeholder="e.g. Lagos" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>State <span className="text-red-400">*</span></label>
                    <select value={state} onChange={e => setState(e.target.value)} className={inp + ' cursor-pointer'}>
                      <option value="">Select state</option>
                      {NIGERIAN_STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>LGA <span className="text-red-400">*</span></label>
                    <input type="text" value={lga} onChange={e => setLga(e.target.value)}
                      placeholder="Local Govt. Area" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Postal Code</label>
                    <input type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)}
                      placeholder="e.g. 101001" className={inp} />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <button onClick={() => { setStep(s => s - 1); setError('') }}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border text-foreground hover:bg-secondary/20 transition-all font-medium text-sm">
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button onClick={handleNext} disabled={mutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 rounded-xl transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-primary/20">
                {mutation.isPending
                  ? <><span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" /> Submitting…</>
                  : step < 2
                    ? <>{STEPS[step + 1].label} <ChevronRight className="w-4 h-4" /></>
                    : <><BadgeCheck className="w-4 h-4" /> Submit KYC</>
                }
              </button>
            </div>
          </div>

          {/* Legal footnote */}
          <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed px-4">
            Your data is encrypted and processed in line with the Nigeria Data Protection Regulation (NDPR) and SEC KYC guidelines.
          </p>
        </div>
      </main>
    </div>
  )
}
