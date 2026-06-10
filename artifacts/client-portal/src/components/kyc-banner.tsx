import { Link } from 'wouter'
import { ShieldCheck, ShieldAlert, ShieldX, ChevronRight, Clock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Shows on the dashboard when the user hasn't completed KYC.
 * Returns null once KYC is verified AND BVN is on file.
 */
export default function KycBanner() {
  const { user } = useAuth()
  if (!user) return null

  const kycSubmitted  = !!user.bvn
  const kycVerified   = user.kycStatus === 'verified'
  const kycUnderReview = user.kycStatus === 'under_review'

  // Fully done — hide banner
  if (kycVerified && kycSubmitted) return null

  // KYC submitted but pending admin review (live mode)
  if (kycUnderReview || (kycSubmitted && !kycVerified)) {
    return (
      <div className="flex items-start gap-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 md:p-5">
        <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-300">KYC Under Review</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Your identity documents have been submitted and are being verified by our compliance team.
            You will be notified once approved — this typically takes 1–2 business days.
          </p>
        </div>
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      </div>
    )
  }

  // Not submitted yet — main call to action
  return (
    <Link href="/kyc">
      <div className="flex items-start gap-4 bg-primary/5 border border-primary/20 rounded-2xl p-4 md:p-5 cursor-pointer hover:bg-primary/10 hover:border-primary/40 transition-all group">
        <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center shrink-0">
          <ShieldX className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-foreground">Complete Account Verification</h3>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">
              REQUIRED
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            SEC Nigeria & CBN require BVN, NIN, and address verification before you can trade.
            Takes 2 minutes — you can start trading once verified.
          </p>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-3">
            {['Personal Details', 'BVN & NIN', 'Address'].map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full border border-border bg-background flex items-center justify-center">
                  <span className="text-[8px] text-muted-foreground font-bold">{i + 1}</span>
                </div>
                <span className="text-[10px] text-muted-foreground hidden sm:block">{s}</span>
                {i < 2 && <ChevronRight className="w-3 h-3 text-muted-foreground/40" />}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 text-primary font-semibold text-sm shrink-0 group-hover:translate-x-0.5 transition-transform">
          Start <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  )
}

/**
 * Compact badge version for sidebar / trade page gates
 */
export function KycStatusBadge() {
  const { user } = useAuth()
  if (!user) return null

  const kycSubmitted = !!user.bvn
  const kycVerified  = user.kycStatus === 'verified'

  if (kycVerified && kycSubmitted) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
        <ShieldCheck className="w-3.5 h-3.5" /> Verified
      </span>
    )
  }
  if (user.kycStatus === 'under_review') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
        <Clock className="w-3.5 h-3.5" /> Under Review
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
      <ShieldX className="w-3.5 h-3.5" /> KYC Required
    </span>
  )
}
