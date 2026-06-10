import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Settings2, Mail, MessageSquare, ShieldCheck, CheckCircle2,
  AlertTriangle, Globe, Bell, FileText, Hash, Phone, Twitter,
  Instagram, Linkedin, Image, AtSign, Clock, RefreshCw, Save,
} from 'lucide-react'
import AdminLayout from '@/components/admin-layout'
import { adminApi } from '@/lib/api'

// ── Tab definition ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'general',     label: 'General',        icon: Globe        },
  { id: 'email',       label: 'Email',          icon: Mail         },
  { id: 'sms',         label: 'SMS & OTP',      icon: MessageSquare },
  { id: 'notif',       label: 'Notifications',  icon: Bell         },
  { id: 'email-tpl',   label: 'Email Templates',icon: FileText     },
  { id: 'sms-tpl',     label: 'SMS Templates',  icon: Hash         },
] as const

type TabId = (typeof TABS)[number]['id']

// ── Form shape ────────────────────────────────────────────────────────────────
interface SF {
  // General
  appName: string; appUrl: string; logoUrl: string
  supportEmail: string; supportPhone: string; complianceEmail: string
  twitterHandle: string; instagramHandle: string; linkedinUrl: string
  footerTagline: string

  // Email provider
  emailProvider: string; emailFromName: string; emailFrom: string
  emailReplyTo: string; emailFooter: string; emailHtml: boolean

  // SMS / OTP
  smsProvider: string; smsFrom: string
  otpLength: string; otpValidityMins: string; otpMaxAttempts: string
  smsRetryOnFail: boolean

  // Notification triggers (email + sms per event)
  notifEmailWelcome: boolean; notifSmsWelcome: boolean
  notifEmailPasswordReset: boolean
  notifEmailLoginAlert: boolean; notifSmsLoginAlert: boolean
  notifEmailPasswordChanged: boolean; notifSmsPasswordChanged: boolean
  notifEmailKycUnderReview: boolean; notifSmsKycUnderReview: boolean
  notifEmailKycApproved: boolean; notifSmsKycApproved: boolean
  notifEmailKycRejected: boolean; notifSmsKycRejected: boolean
  notifEmailOrderPlaced: boolean; notifSmsOrderPlaced: boolean
  notifEmailOrderFilled: boolean; notifSmsOrderFilled: boolean
  notifEmailOrderCancelled: boolean; notifSmsOrderCancelled: boolean
  notifEmailDepositConfirmed: boolean; notifSmsDepositConfirmed: boolean
  notifEmailWithdrawalRequested: boolean; notifSmsWithdrawalRequested: boolean
  notifEmailWithdrawalProcessed: boolean; notifSmsWithdrawalProcessed: boolean
  notifEmailDailyStatement: boolean
  notifEmailWeeklyReport: boolean

  // Email templates
  tplWelcomeSubject: string; tplWelcomeBody: string
  tplPasswordResetSubject: string; tplPasswordResetBody: string
  tplLoginAlertSubject: string; tplLoginAlertBody: string
  tplPasswordChangedSubject: string; tplPasswordChangedBody: string
  tplKycUnderReviewSubject: string; tplKycUnderReviewBody: string
  tplKycApprovedSubject: string; tplKycApprovedBody: string
  tplKycRejectedSubject: string; tplKycRejectedBody: string
  tplOrderPlacedSubject: string; tplOrderPlacedBody: string
  tplOrderFilledSubject: string; tplOrderFilledBody: string
  tplDepositConfirmedSubject: string; tplDepositConfirmedBody: string
  tplWithdrawalProcessedSubject: string; tplWithdrawalProcessedBody: string

  // SMS templates
  tplSmsOtp: string; tplSmsLoginOtp: string
  tplSmsKycApproved: string; tplSmsKycRejected: string; tplSmsKycUnderReview: string
  tplSmsOrderFilled: string
  tplSmsDepositConfirmed: string; tplSmsWithdrawalProcessed: string
  tplSmsLoginAlert: string
}

const DEFAULT: SF = {
  appName: 'StockBroker NG', appUrl: 'https://app.stockbroker.ng',
  logoUrl: '', supportEmail: 'support@stockbroker.ng',
  supportPhone: '+234 800 000 0000', complianceEmail: 'compliance@stockbroker.ng',
  twitterHandle: '@StockBrokerNG', instagramHandle: '@stockbrokerng', linkedinUrl: '',
  footerTagline: 'SEC-registered stockbroker · Member NSE · CSCS participant',

  emailProvider: 'console', emailFromName: 'StockBroker NG',
  emailFrom: 'noreply@stockbroker.ng', emailReplyTo: 'support@stockbroker.ng',
  emailFooter: 'StockBroker NG is a Securities and Exchange Commission (SEC) registered stockbroker. This email and any attachments are confidential.',
  emailHtml: true,

  smsProvider: 'console', smsFrom: 'SBNG',
  otpLength: '6', otpValidityMins: '10', otpMaxAttempts: '3', smsRetryOnFail: true,

  notifEmailWelcome: true, notifSmsWelcome: false,
  notifEmailPasswordReset: true,
  notifEmailLoginAlert: true, notifSmsLoginAlert: true,
  notifEmailPasswordChanged: true, notifSmsPasswordChanged: true,
  notifEmailKycUnderReview: true, notifSmsKycUnderReview: true,
  notifEmailKycApproved: true, notifSmsKycApproved: true,
  notifEmailKycRejected: true, notifSmsKycRejected: true,
  notifEmailOrderPlaced: true, notifSmsOrderPlaced: false,
  notifEmailOrderFilled: true, notifSmsOrderFilled: true,
  notifEmailOrderCancelled: true, notifSmsOrderCancelled: false,
  notifEmailDepositConfirmed: true, notifSmsDepositConfirmed: true,
  notifEmailWithdrawalRequested: true, notifSmsWithdrawalRequested: true,
  notifEmailWithdrawalProcessed: true, notifSmsWithdrawalProcessed: true,
  notifEmailDailyStatement: false, notifEmailWeeklyReport: false,

  tplWelcomeSubject: 'Welcome to StockBroker NG — your account is ready',
  tplWelcomeBody: `Hello {{fullName}},

Welcome to StockBroker NG! Your account has been created successfully.

To start trading on the Nigerian Exchange (NGX), please complete your KYC verification:
{{appUrl}}/kyc

Once verified, you can:
• Buy and sell NGX-listed stocks
• Track your portfolio in real-time
• Set price alerts and get notifications

If you have any questions, contact us at {{supportEmail}}.

Happy investing,
The StockBroker NG Team`,

  tplPasswordResetSubject: 'Reset your StockBroker NG password',
  tplPasswordResetBody: `Hello {{fullName}},

We received a request to reset the password for your StockBroker NG account.

Reset your password here (expires in 1 hour):
{{resetLink}}

If you did not request this, please ignore this email and your password will remain unchanged. If you suspect unauthorized access, contact us immediately at {{supportEmail}}.

The StockBroker NG Team`,

  tplLoginAlertSubject: 'New sign-in to your StockBroker NG account',
  tplLoginAlertBody: `Hello {{fullName}},

A new sign-in was detected on your account:

Device: {{deviceInfo}}
Location: {{location}}
Time: {{loginTime}} WAT

If this was you, no action is needed.

If this was NOT you, please change your password immediately and contact {{supportEmail}}.

The StockBroker NG Security Team`,

  tplPasswordChangedSubject: 'Your StockBroker NG password was changed',
  tplPasswordChangedBody: `Hello {{fullName}},

Your StockBroker NG password was successfully changed on {{changedAt}} WAT.

If you made this change, you can ignore this email.

If you did NOT make this change, contact us immediately at {{supportEmail}} or call {{supportPhone}}.

The StockBroker NG Security Team`,

  tplKycUnderReviewSubject: 'Your KYC documents are under review',
  tplKycUnderReviewBody: `Hello {{fullName}},

Thank you for submitting your KYC documents. Our compliance team is currently reviewing your submission.

You will be notified once the review is complete (usually within 1–2 business days).

In the meantime, you can view your KYC status at:
{{appUrl}}/kyc

The StockBroker NG Compliance Team`,

  tplKycApprovedSubject: 'Your KYC is approved — you can now trade!',
  tplKycApprovedBody: `Hello {{fullName}},

Great news! Your KYC verification has been approved.

Your account is now cleared for trading on the Nigerian Exchange (NGX). You can start investing at:
{{appUrl}}/trade

Your account tier: {{kycTier}}
Daily trading limit: {{tradingLimit}}

If you have questions, we're at {{supportEmail}}.

Happy trading!
The StockBroker NG Team`,

  tplKycRejectedSubject: 'Action required: Your KYC needs attention',
  tplKycRejectedBody: `Hello {{fullName}},

We were unable to verify your KYC documents. Here is the reason:

{{rejectionReason}}

Please log in and resubmit the required documents:
{{appUrl}}/kyc

Common issues:
• Documents are blurry or cut off
• BVN or NIN mismatch
• Expired identification documents

Contact our compliance team at {{complianceEmail}} if you need assistance.

The StockBroker NG Compliance Team`,

  tplOrderPlacedSubject: 'Order placed — {{symbol}} {{side}}',
  tplOrderPlacedBody: `Hello {{fullName}},

Your order has been placed on the NGX:

Symbol: {{symbol}}
Side: {{side}}
Type: {{orderType}}
Quantity: {{quantity}} units
{{limitPriceLine}}
Order ID: {{orderId}}
Time: {{orderTime}} WAT

You will be notified when the order is filled or cancelled. Track your orders at:
{{appUrl}}/orders

StockBroker NG`,

  tplOrderFilledSubject: 'Order filled — {{symbol}} {{side}} ₦{{fillPrice}}',
  tplOrderFilledBody: `Hello {{fullName}},

Your order has been executed:

Symbol: {{symbol}} — {{companyName}}
Side: {{side}}
Quantity: {{quantity}} units @ ₦{{fillPrice}}
Total value: ₦{{totalValue}}
Brokerage fee: ₦{{brokerageFee}}
Net amount: ₦{{netAmount}}
Order ID: {{orderId}}
Fill time: {{fillTime}} WAT

Settlement: T+2 ({{settlementDate}})

View your portfolio at: {{appUrl}}/portfolio

StockBroker NG`,

  tplDepositConfirmedSubject: 'Deposit confirmed — ₦{{amount}}',
  tplDepositConfirmedBody: `Hello {{fullName}},

Your deposit has been confirmed and your account has been credited:

Amount: ₦{{amount}}
Reference: {{reference}}
Date: {{depositDate}} WAT
New balance: ₦{{newBalance}}

You can now use these funds to trade at:
{{appUrl}}/trade

StockBroker NG`,

  tplWithdrawalProcessedSubject: 'Withdrawal processed — ₦{{amount}}',
  tplWithdrawalProcessedBody: `Hello {{fullName}},

Your withdrawal has been processed:

Amount: ₦{{amount}}
Bank: {{bankName}}
Account: {{accountNumber}}
Reference: {{reference}}
Date: {{processedDate}} WAT

Funds typically arrive within 1 business day. If you have any issues, contact {{supportEmail}}.

StockBroker NG`,

  tplSmsOtp: 'Your StockBroker NG verification code is {{otp}}. Valid for {{validityMins}} minutes. Do not share this code.',
  tplSmsLoginOtp: 'StockBroker NG login code: {{otp}}. Valid for {{validityMins}} mins. If not you, secure your account now.',
  tplSmsKycApproved: 'Your StockBroker NG KYC is approved! You can now trade NGX stocks. Visit {{appUrl}} to start.',
  tplSmsKycRejected: 'Your StockBroker NG KYC requires attention. Login to resubmit documents: {{appUrl}}/kyc',
  tplSmsKycUnderReview: 'StockBroker NG: KYC submitted. Our team will review within 1-2 business days.',
  tplSmsOrderFilled: 'Order filled: {{side}} {{quantity}} {{symbol}} @ ₦{{fillPrice}}. Total: ₦{{totalValue}}. See {{appUrl}}/orders',
  tplSmsDepositConfirmed: 'Deposit confirmed: ₦{{amount}} credited to your StockBroker NG account. Balance: ₦{{newBalance}}.',
  tplSmsWithdrawalProcessed: 'Withdrawal of ₦{{amount}} to {{bankName}} processed. Ref: {{reference}}. StockBroker NG.',
  tplSmsLoginAlert: 'New StockBroker NG sign-in detected. If not you, call {{supportPhone}} immediately.',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function flat(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object') return {}
  return v as Record<string, unknown>
}
function str(v: unknown, fb = ''): string {
  return typeof v === 'string' ? v : fb
}
function bool(v: unknown, fb = false): boolean {
  if (typeof v === 'boolean') return v
  if (v === 'true') return true
  if (v === 'false') return false
  return fb
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Field({
  label, children, hint,
}: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase">{label}</label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="text-[10px] text-muted-foreground/70 mt-1">{hint}</p>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
    />
  )
}

function Textarea({ value, onChange, rows = 4, placeholder }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-y font-mono"
    />
  )
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Toggle({ checked, onChange, label, hint }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors mt-0.5 ${checked ? 'bg-primary' : 'bg-border'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
      <div>
        <p className="text-sm text-foreground font-medium">{label}</p>
        {hint && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{hint}</p>}
      </div>
    </label>
  )
}

// Notification event row: email + SMS toggles
function NotifRow({
  label, hint, emailKey, smsKey, form, set,
  emailOnly,
}: {
  label: string; hint?: string
  emailKey: keyof SF; smsKey?: keyof SF
  form: SF; set: (k: keyof SF, v: boolean) => void
  emailOnly?: boolean
}) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{hint}</p>}
      </div>
      <div className="flex items-center gap-5 shrink-0">
        <label className="flex flex-col items-center gap-1 cursor-pointer">
          <button
            type="button"
            onClick={() => set(emailKey, !(form[emailKey] as boolean))}
            className={`w-8 h-4 rounded-full transition-colors ${form[emailKey] ? 'bg-primary' : 'bg-border'}`}
          >
            <span className={`block w-3 h-3 bg-white rounded-full shadow transition-transform mt-0.5 ${form[emailKey] ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-[9px] text-muted-foreground uppercase font-bold">Email</span>
        </label>
        {!emailOnly && smsKey && (
          <label className="flex flex-col items-center gap-1 cursor-pointer">
            <button
              type="button"
              onClick={() => set(smsKey, !(form[smsKey] as boolean))}
              className={`w-8 h-4 rounded-full transition-colors ${form[smsKey] ? 'bg-blue-500' : 'bg-border'}`}
            >
              <span className={`block w-3 h-3 bg-white rounded-full shadow transition-transform mt-0.5 ${form[smsKey] ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-[9px] text-muted-foreground uppercase font-bold">SMS</span>
          </label>
        )}
      </div>
    </div>
  )
}

// Template section: subject + body with variable hints
function TemplatePair({
  label, subjectKey, bodyKey, vars, form, set,
}: {
  label: string; subjectKey: keyof SF; bodyKey: keyof SF
  vars?: string[]; form: SF; set: (k: keyof SF, v: string) => void
}) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-foreground uppercase tracking-wide">{label}</p>
        {vars && (
          <div className="flex flex-wrap gap-1">
            {vars.map((v) => (
              <span key={v} className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">{`{{${v}}}`}</span>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <input
          value={form[subjectKey] as string}
          onChange={(e) => set(subjectKey, e.target.value)}
          placeholder="Subject line…"
          className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <textarea
          rows={5}
          value={form[bodyKey] as string}
          onChange={(e) => set(bodyKey, e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground resize-y font-mono focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
        />
      </div>
    </div>
  )
}

function SmsTemplatePair({
  label, bodyKey, vars, form, set,
}: {
  label: string; bodyKey: keyof SF; vars?: string[]; form: SF; set: (k: keyof SF, v: string) => void
}) {
  const v = form[bodyKey] as string
  const charCount = v.length
  const smsCount = Math.ceil(charCount / 160) || 1
  return (
    <div className="rounded-xl border border-border bg-background/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-foreground uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-2">
          {vars && vars.map((v) => (
            <span key={v} className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-mono">{`{{${v}}}`}</span>
          ))}
          <span className={`text-[9px] font-mono ml-1 ${charCount > 160 ? 'text-amber-400' : 'text-muted-foreground'}`}>
            {charCount}ch · {smsCount} SMS
          </span>
        </div>
      </div>
      <textarea
        rows={3}
        value={v}
        onChange={(e) => set(bodyKey, e.target.value)}
        className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground resize-y font-mono focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  )
}

function SectionHeader({ icon: Icon, title, description }: {
  icon: React.FC<{ className?: string }>; title: string; description: string
}) {
  return (
    <div className="flex items-start gap-3 mb-5 pb-4 border-b border-border">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminSettings() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabId>('general')
  const [form, setForm] = useState<SF>(DEFAULT)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSettings(),
  })

  useEffect(() => {
    if (!data) return
    const s = data.settings ?? {}
    const identity  = flat(s.app_identity)
    const emailConf = flat(s.email_config)
    const smsConf   = flat(s.sms_config)
    const triggers  = flat(s.notification_triggers)
    const emailTpls = flat(s.email_templates)
    const smsTpls   = flat(s.sms_templates)

    setForm({
      appName:            str(identity.appName,           DEFAULT.appName),
      appUrl:             str(identity.appUrl,            DEFAULT.appUrl),
      logoUrl:            str(identity.logoUrl,           DEFAULT.logoUrl),
      supportEmail:       str(identity.supportEmail,      DEFAULT.supportEmail),
      supportPhone:       str(identity.supportPhone,      DEFAULT.supportPhone),
      complianceEmail:    str(identity.complianceEmail,   DEFAULT.complianceEmail),
      twitterHandle:      str(identity.twitterHandle,     DEFAULT.twitterHandle),
      instagramHandle:    str(identity.instagramHandle,   DEFAULT.instagramHandle),
      linkedinUrl:        str(identity.linkedinUrl,       DEFAULT.linkedinUrl),
      footerTagline:      str(identity.footerTagline,     DEFAULT.footerTagline),

      emailProvider:      str(emailConf.provider,         DEFAULT.emailProvider),
      emailFromName:      str(emailConf.fromName,         DEFAULT.emailFromName),
      emailFrom:          str(emailConf.fromEmail,        DEFAULT.emailFrom),
      emailReplyTo:       str(emailConf.replyTo,          DEFAULT.emailReplyTo),
      emailFooter:        str(emailConf.footer,           DEFAULT.emailFooter),
      emailHtml:          bool(emailConf.htmlEnabled,     DEFAULT.emailHtml),

      smsProvider:        str(smsConf.provider,           DEFAULT.smsProvider),
      smsFrom:            str(smsConf.fromId,             DEFAULT.smsFrom),
      otpLength:          str(smsConf.otpLength,          DEFAULT.otpLength),
      otpValidityMins:    str(smsConf.otpValidityMins,    DEFAULT.otpValidityMins),
      otpMaxAttempts:     str(smsConf.otpMaxAttempts,     DEFAULT.otpMaxAttempts),
      smsRetryOnFail:     bool(smsConf.retryOnFail,       DEFAULT.smsRetryOnFail),

      notifEmailWelcome:              bool(triggers.emailWelcome,              DEFAULT.notifEmailWelcome),
      notifSmsWelcome:                bool(triggers.smsWelcome,                DEFAULT.notifSmsWelcome),
      notifEmailPasswordReset:        bool(triggers.emailPasswordReset,        DEFAULT.notifEmailPasswordReset),
      notifEmailLoginAlert:           bool(triggers.emailLoginAlert,           DEFAULT.notifEmailLoginAlert),
      notifSmsLoginAlert:             bool(triggers.smsLoginAlert,             DEFAULT.notifSmsLoginAlert),
      notifEmailPasswordChanged:      bool(triggers.emailPasswordChanged,      DEFAULT.notifEmailPasswordChanged),
      notifSmsPasswordChanged:        bool(triggers.smsPasswordChanged,        DEFAULT.notifSmsPasswordChanged),
      notifEmailKycUnderReview:       bool(triggers.emailKycUnderReview,       DEFAULT.notifEmailKycUnderReview),
      notifSmsKycUnderReview:         bool(triggers.smsKycUnderReview,         DEFAULT.notifSmsKycUnderReview),
      notifEmailKycApproved:          bool(triggers.emailKycApproved,          DEFAULT.notifEmailKycApproved),
      notifSmsKycApproved:            bool(triggers.smsKycApproved,            DEFAULT.notifSmsKycApproved),
      notifEmailKycRejected:          bool(triggers.emailKycRejected,          DEFAULT.notifEmailKycRejected),
      notifSmsKycRejected:            bool(triggers.smsKycRejected,            DEFAULT.notifSmsKycRejected),
      notifEmailOrderPlaced:          bool(triggers.emailOrderPlaced,          DEFAULT.notifEmailOrderPlaced),
      notifSmsOrderPlaced:            bool(triggers.smsOrderPlaced,            DEFAULT.notifSmsOrderPlaced),
      notifEmailOrderFilled:          bool(triggers.emailOrderFilled,          DEFAULT.notifEmailOrderFilled),
      notifSmsOrderFilled:            bool(triggers.smsOrderFilled,            DEFAULT.notifSmsOrderFilled),
      notifEmailOrderCancelled:       bool(triggers.emailOrderCancelled,       DEFAULT.notifEmailOrderCancelled),
      notifSmsOrderCancelled:         bool(triggers.smsOrderCancelled,         DEFAULT.notifSmsOrderCancelled),
      notifEmailDepositConfirmed:     bool(triggers.emailDepositConfirmed,     DEFAULT.notifEmailDepositConfirmed),
      notifSmsDepositConfirmed:       bool(triggers.smsDepositConfirmed,       DEFAULT.notifSmsDepositConfirmed),
      notifEmailWithdrawalRequested:  bool(triggers.emailWithdrawalRequested,  DEFAULT.notifEmailWithdrawalRequested),
      notifSmsWithdrawalRequested:    bool(triggers.smsWithdrawalRequested,    DEFAULT.notifSmsWithdrawalRequested),
      notifEmailWithdrawalProcessed:  bool(triggers.emailWithdrawalProcessed,  DEFAULT.notifEmailWithdrawalProcessed),
      notifSmsWithdrawalProcessed:    bool(triggers.smsWithdrawalProcessed,    DEFAULT.notifSmsWithdrawalProcessed),
      notifEmailDailyStatement:       bool(triggers.emailDailyStatement,       DEFAULT.notifEmailDailyStatement),
      notifEmailWeeklyReport:         bool(triggers.emailWeeklyReport,         DEFAULT.notifEmailWeeklyReport),

      tplWelcomeSubject:            str(emailTpls.welcomeSubject,           DEFAULT.tplWelcomeSubject),
      tplWelcomeBody:               str(emailTpls.welcomeBody,              DEFAULT.tplWelcomeBody),
      tplPasswordResetSubject:      str(emailTpls.passwordResetSubject,     DEFAULT.tplPasswordResetSubject),
      tplPasswordResetBody:         str(emailTpls.passwordResetBody,        DEFAULT.tplPasswordResetBody),
      tplLoginAlertSubject:         str(emailTpls.loginAlertSubject,        DEFAULT.tplLoginAlertSubject),
      tplLoginAlertBody:            str(emailTpls.loginAlertBody,           DEFAULT.tplLoginAlertBody),
      tplPasswordChangedSubject:    str(emailTpls.passwordChangedSubject,   DEFAULT.tplPasswordChangedSubject),
      tplPasswordChangedBody:       str(emailTpls.passwordChangedBody,      DEFAULT.tplPasswordChangedBody),
      tplKycUnderReviewSubject:     str(emailTpls.kycUnderReviewSubject,    DEFAULT.tplKycUnderReviewSubject),
      tplKycUnderReviewBody:        str(emailTpls.kycUnderReviewBody,       DEFAULT.tplKycUnderReviewBody),
      tplKycApprovedSubject:        str(emailTpls.kycApprovedSubject,       DEFAULT.tplKycApprovedSubject),
      tplKycApprovedBody:           str(emailTpls.kycApprovedBody,          DEFAULT.tplKycApprovedBody),
      tplKycRejectedSubject:        str(emailTpls.kycRejectedSubject,       DEFAULT.tplKycRejectedSubject),
      tplKycRejectedBody:           str(emailTpls.kycRejectedBody,          DEFAULT.tplKycRejectedBody),
      tplOrderPlacedSubject:        str(emailTpls.orderPlacedSubject,       DEFAULT.tplOrderPlacedSubject),
      tplOrderPlacedBody:           str(emailTpls.orderPlacedBody,          DEFAULT.tplOrderPlacedBody),
      tplOrderFilledSubject:        str(emailTpls.orderFilledSubject,       DEFAULT.tplOrderFilledSubject),
      tplOrderFilledBody:           str(emailTpls.orderFilledBody,          DEFAULT.tplOrderFilledBody),
      tplDepositConfirmedSubject:   str(emailTpls.depositConfirmedSubject,  DEFAULT.tplDepositConfirmedSubject),
      tplDepositConfirmedBody:      str(emailTpls.depositConfirmedBody,     DEFAULT.tplDepositConfirmedBody),
      tplWithdrawalProcessedSubject:str(emailTpls.withdrawalProcessedSubject, DEFAULT.tplWithdrawalProcessedSubject),
      tplWithdrawalProcessedBody:   str(emailTpls.withdrawalProcessedBody,  DEFAULT.tplWithdrawalProcessedBody),

      tplSmsOtp:                   str(smsTpls.otp,                  DEFAULT.tplSmsOtp),
      tplSmsLoginOtp:              str(smsTpls.loginOtp,             DEFAULT.tplSmsLoginOtp),
      tplSmsKycApproved:           str(smsTpls.kycApproved,          DEFAULT.tplSmsKycApproved),
      tplSmsKycRejected:           str(smsTpls.kycRejected,          DEFAULT.tplSmsKycRejected),
      tplSmsKycUnderReview:        str(smsTpls.kycUnderReview,       DEFAULT.tplSmsKycUnderReview),
      tplSmsOrderFilled:           str(smsTpls.orderFilled,          DEFAULT.tplSmsOrderFilled),
      tplSmsDepositConfirmed:      str(smsTpls.depositConfirmed,     DEFAULT.tplSmsDepositConfirmed),
      tplSmsWithdrawalProcessed:   str(smsTpls.withdrawalProcessed,  DEFAULT.tplSmsWithdrawalProcessed),
      tplSmsLoginAlert:            str(smsTpls.loginAlert,           DEFAULT.tplSmsLoginAlert),
    })
  }, [data])

  const saveMut = useMutation({
    mutationFn: (settings: Record<string, unknown>) => adminApi.updateSettings(settings),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
  })

  const set = (k: keyof SF, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }))

  const setStr = (k: keyof SF) => (v: string) => set(k, v)
  const setBool = (k: keyof SF) => (v: boolean) => set(k, v)
  const setBoolField = (k: keyof SF, v: boolean) => set(k, v)

  function buildPayload(): Record<string, unknown> {
    return {
      app_identity: {
        appName: form.appName, appUrl: form.appUrl, logoUrl: form.logoUrl,
        supportEmail: form.supportEmail, supportPhone: form.supportPhone,
        complianceEmail: form.complianceEmail,
        twitterHandle: form.twitterHandle, instagramHandle: form.instagramHandle, linkedinUrl: form.linkedinUrl,
        footerTagline: form.footerTagline,
      },
      // Keep legacy keys for backward compat
      app_name: form.appName, app_url: form.appUrl,
      email_provider: { provider: form.emailProvider, fromEmail: form.emailFrom, supportEmail: form.supportEmail },
      sms_provider: { provider: form.smsProvider, fromNumber: form.smsFrom },
      email_config: {
        provider: form.emailProvider, fromName: form.emailFromName,
        fromEmail: form.emailFrom, replyTo: form.emailReplyTo,
        footer: form.emailFooter, htmlEnabled: form.emailHtml,
      },
      sms_config: {
        provider: form.smsProvider, fromId: form.smsFrom,
        otpLength: form.otpLength, otpValidityMins: form.otpValidityMins,
        otpMaxAttempts: form.otpMaxAttempts, retryOnFail: form.smsRetryOnFail,
      },
      notification_triggers: {
        emailWelcome: form.notifEmailWelcome, smsWelcome: form.notifSmsWelcome,
        emailPasswordReset: form.notifEmailPasswordReset,
        emailLoginAlert: form.notifEmailLoginAlert, smsLoginAlert: form.notifSmsLoginAlert,
        emailPasswordChanged: form.notifEmailPasswordChanged, smsPasswordChanged: form.notifSmsPasswordChanged,
        emailKycUnderReview: form.notifEmailKycUnderReview, smsKycUnderReview: form.notifSmsKycUnderReview,
        emailKycApproved: form.notifEmailKycApproved, smsKycApproved: form.notifSmsKycApproved,
        emailKycRejected: form.notifEmailKycRejected, smsKycRejected: form.notifSmsKycRejected,
        emailOrderPlaced: form.notifEmailOrderPlaced, smsOrderPlaced: form.notifSmsOrderPlaced,
        emailOrderFilled: form.notifEmailOrderFilled, smsOrderFilled: form.notifSmsOrderFilled,
        emailOrderCancelled: form.notifEmailOrderCancelled, smsOrderCancelled: form.notifSmsOrderCancelled,
        emailDepositConfirmed: form.notifEmailDepositConfirmed, smsDepositConfirmed: form.notifSmsDepositConfirmed,
        emailWithdrawalRequested: form.notifEmailWithdrawalRequested, smsWithdrawalRequested: form.notifSmsWithdrawalRequested,
        emailWithdrawalProcessed: form.notifEmailWithdrawalProcessed, smsWithdrawalProcessed: form.notifSmsWithdrawalProcessed,
        emailDailyStatement: form.notifEmailDailyStatement, emailWeeklyReport: form.notifEmailWeeklyReport,
      },
      email_templates: {
        welcomeSubject: form.tplWelcomeSubject, welcomeBody: form.tplWelcomeBody,
        passwordResetSubject: form.tplPasswordResetSubject, passwordResetBody: form.tplPasswordResetBody,
        loginAlertSubject: form.tplLoginAlertSubject, loginAlertBody: form.tplLoginAlertBody,
        passwordChangedSubject: form.tplPasswordChangedSubject, passwordChangedBody: form.tplPasswordChangedBody,
        kycUnderReviewSubject: form.tplKycUnderReviewSubject, kycUnderReviewBody: form.tplKycUnderReviewBody,
        kycApprovedSubject: form.tplKycApprovedSubject, kycApprovedBody: form.tplKycApprovedBody,
        kycRejectedSubject: form.tplKycRejectedSubject, kycRejectedBody: form.tplKycRejectedBody,
        orderPlacedSubject: form.tplOrderPlacedSubject, orderPlacedBody: form.tplOrderPlacedBody,
        orderFilledSubject: form.tplOrderFilledSubject, orderFilledBody: form.tplOrderFilledBody,
        depositConfirmedSubject: form.tplDepositConfirmedSubject, depositConfirmedBody: form.tplDepositConfirmedBody,
        withdrawalProcessedSubject: form.tplWithdrawalProcessedSubject, withdrawalProcessedBody: form.tplWithdrawalProcessedBody,
      },
      sms_templates: {
        otp: form.tplSmsOtp, loginOtp: form.tplSmsLoginOtp,
        kycApproved: form.tplSmsKycApproved, kycRejected: form.tplSmsKycRejected, kycUnderReview: form.tplSmsKycUnderReview,
        orderFilled: form.tplSmsOrderFilled,
        depositConfirmed: form.tplSmsDepositConfirmed, withdrawalProcessed: form.tplSmsWithdrawalProcessed,
        loginAlert: form.tplSmsLoginAlert,
      },
    }
  }

  return (
    <AdminLayout
      title="Settings"
      subtitle="Email, SMS, notification triggers, and message templates"
      actions={
        <button
          onClick={() => saveMut.mutate(buildPayload())}
          disabled={saveMut.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
        >
          {saveMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saveMut.isPending ? 'Saving…' : 'Save all settings'}
        </button>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Save status */}
          {saveMut.isSuccess && (
            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-emerald-400 text-sm w-fit">
              <CheckCircle2 className="w-4 h-4" /> All settings saved successfully.
            </div>
          )}
          {saveMut.isError && (
            <div className="inline-flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-rose-400 text-sm w-fit">
              <AlertTriangle className="w-4 h-4" /> Save failed — please try again.
            </div>
          )}

          {/* Tab navigation */}
          <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  tab === id
                    ? 'bg-primary/10 text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/20'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="max-w-4xl">

            {/* ── GENERAL TAB ── */}
            {tab === 'general' && (
              <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                <SectionHeader icon={Globe} title="Platform Identity" description="Your brokerage brand, contact details, and social handles used across all notifications." />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Platform Name" hint="Used in email subjects and SMS templates via {{appName}}">
                    <Input value={form.appName} onChange={setStr('appName')} placeholder="StockBroker NG" />
                  </Field>
                  <Field label="Platform URL" hint="Used in email links and templates via {{appUrl}}">
                    <Input value={form.appUrl} onChange={setStr('appUrl')} type="url" placeholder="https://app.stockbroker.ng" />
                  </Field>
                  <Field label="Support Email" hint="Shown in email footers and templates via {{supportEmail}}">
                    <Input value={form.supportEmail} onChange={setStr('supportEmail')} type="email" placeholder="support@stockbroker.ng" />
                  </Field>
                  <Field label="Support Phone" hint="Shown in SMS alerts via {{supportPhone}}">
                    <Input value={form.supportPhone} onChange={setStr('supportPhone')} placeholder="+234 800 000 0000" />
                  </Field>
                  <Field label="Compliance Email" hint="For KYC rejection templates via {{complianceEmail}}">
                    <Input value={form.complianceEmail} onChange={setStr('complianceEmail')} type="email" placeholder="compliance@stockbroker.ng" />
                  </Field>
                  <Field label="Logo URL" hint="Full URL to your logo image for HTML emails">
                    <Input value={form.logoUrl} onChange={setStr('logoUrl')} type="url" placeholder="https://cdn.stockbroker.ng/logo.png" />
                  </Field>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Social Media</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Twitter / X Handle">
                      <div className="flex items-center gap-2">
                        <Twitter className="w-4 h-4 text-muted-foreground shrink-0" />
                        <Input value={form.twitterHandle} onChange={setStr('twitterHandle')} placeholder="@StockBrokerNG" />
                      </div>
                    </Field>
                    <Field label="Instagram Handle">
                      <div className="flex items-center gap-2">
                        <Instagram className="w-4 h-4 text-muted-foreground shrink-0" />
                        <Input value={form.instagramHandle} onChange={setStr('instagramHandle')} placeholder="@stockbrokerng" />
                      </div>
                    </Field>
                    <Field label="LinkedIn URL">
                      <div className="flex items-center gap-2">
                        <Linkedin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <Input value={form.linkedinUrl} onChange={setStr('linkedinUrl')} placeholder="https://linkedin.com/company/…" />
                      </div>
                    </Field>
                  </div>
                </div>
                <Field label="Email Footer Tagline" hint="Legal disclaimer shown at the bottom of every email">
                  <Input value={form.footerTagline} onChange={setStr('footerTagline')} placeholder="SEC-registered stockbroker · Member NSE · CSCS participant" />
                </Field>
              </div>
            )}

            {/* ── EMAIL TAB ── */}
            {tab === 'email' && (
              <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                <SectionHeader icon={Mail} title="Email Configuration" description="Choose your email delivery provider and configure sender identity." />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Email Provider">
                    <Select
                      value={form.emailProvider}
                      onChange={setStr('emailProvider')}
                      options={[
                        { value: 'console', label: 'Console / Disabled (dev)' },
                        { value: 'sendgrid', label: 'SendGrid' },
                        { value: 'smtp', label: 'SMTP / Brevo / Custom' },
                      ]}
                    />
                  </Field>
                  <Field label="Sender Name" hint="The name displayed in the From field — e.g. 'StockBroker NG'">
                    <Input value={form.emailFromName} onChange={setStr('emailFromName')} placeholder="StockBroker NG" />
                  </Field>
                  <Field label="From Email Address" hint="The sender email address. Must be verified with your ESP.">
                    <div className="flex items-center gap-2">
                      <AtSign className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Input value={form.emailFrom} onChange={setStr('emailFrom')} type="email" placeholder="noreply@stockbroker.ng" />
                    </div>
                  </Field>
                  <Field label="Reply-To Address" hint="Where client replies are directed — usually your support inbox.">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Input value={form.emailReplyTo} onChange={setStr('emailReplyTo')} type="email" placeholder="support@stockbroker.ng" />
                    </div>
                  </Field>
                </div>
                <Field label="Email Footer / Legal Disclaimer" hint="Appears at the bottom of every HTML email. Supports plain text.">
                  <Textarea rows={3} value={form.emailFooter} onChange={setStr('emailFooter')} placeholder="Your legal disclaimer…" />
                </Field>
                <div className="space-y-3">
                  <Toggle
                    checked={form.emailHtml}
                    onChange={setBool('emailHtml')}
                    label="Enable HTML emails"
                    hint="Send rich HTML emails with branding and formatting. Disable to send plain-text only."
                  />
                </div>
                {form.emailProvider !== 'console' && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300">
                      API credentials for <strong>{form.emailProvider === 'sendgrid' ? 'SendGrid' : 'SMTP'}</strong> must be configured in the Developer panel.
                      Go to <strong>Admin → Developer</strong> to add your credentials.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── SMS & OTP TAB ── */}
            {tab === 'sms' && (
              <div className="bg-card border border-border rounded-xl p-6 space-y-6">
                <SectionHeader icon={MessageSquare} title="SMS & OTP Configuration" description="SMS delivery provider, sender identity, and one-time password settings." />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="SMS Provider">
                    <Select
                      value={form.smsProvider}
                      onChange={setStr('smsProvider')}
                      options={[
                        { value: 'console', label: 'Console / Disabled (dev)' },
                        { value: 'twilio', label: 'Twilio' },
                        { value: 'achek', label: 'Achek (Nigerian)' },
                      ]}
                    />
                  </Field>
                  <Field label="Sender ID / From Number"
                    hint={form.smsProvider === 'twilio' ? 'Your Twilio phone number e.g. +2348012345678' : 'Alphanumeric sender ID (max 11 chars) e.g. SBNG'}>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Input value={form.smsFrom} onChange={setStr('smsFrom')} placeholder={form.smsProvider === 'twilio' ? '+2348012345678' : 'SBNG'} />
                    </div>
                  </Field>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> OTP Settings
                  </p>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="OTP Length" hint="Number of digits in each OTP code">
                      <Select
                        value={form.otpLength}
                        onChange={setStr('otpLength')}
                        options={[{ value: '4', label: '4 digits' }, { value: '6', label: '6 digits (recommended)' }]}
                      />
                    </Field>
                    <Field label="Validity (minutes)" hint="How long before the OTP expires">
                      <Input value={form.otpValidityMins} onChange={setStr('otpValidityMins')} placeholder="10" />
                    </Field>
                    <Field label="Max Attempts" hint="Failed attempts before OTP is invalidated">
                      <Input value={form.otpMaxAttempts} onChange={setStr('otpMaxAttempts')} placeholder="3" />
                    </Field>
                  </div>
                </div>
                <div className="space-y-3">
                  <Toggle
                    checked={form.smsRetryOnFail}
                    onChange={setBool('smsRetryOnFail')}
                    label="Retry SMS on delivery failure"
                    hint="Automatically retry once if the first SMS delivery attempt fails."
                  />
                </div>
                {form.smsProvider !== 'console' && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300">
                      API credentials for <strong>{form.smsProvider === 'twilio' ? 'Twilio' : 'Achek'}</strong> must be configured in the Developer panel.
                      Go to <strong>Admin → Developer</strong> to add your API keys.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── NOTIFICATIONS TAB ── */}
            {tab === 'notif' && (
              <div className="bg-card border border-border rounded-xl p-6">
                <SectionHeader icon={Bell} title="Notification Triggers" description="Control exactly which events send emails and SMS to your clients. Toggle each channel independently." />
                <div className="flex items-center justify-end gap-6 mb-2 pr-2 text-[10px] font-bold text-muted-foreground uppercase">
                  <span className="w-14 text-center">Email</span>
                  <span className="w-14 text-center">SMS</span>
                </div>
                <div className="divide-y divide-border/50">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground py-2">Account & Security</p>
                  <NotifRow label="New account welcome" hint="Sent when a new client registers"
                    emailKey="notifEmailWelcome" smsKey="notifSmsWelcome" form={form} set={setBoolField} />
                  <NotifRow label="Password reset" hint="OTP/link to reset password — always enabled"
                    emailKey="notifEmailPasswordReset" form={form} set={setBoolField} emailOnly />
                  <NotifRow label="Login from new device" hint="Security alert when sign-in detected from unfamiliar device"
                    emailKey="notifEmailLoginAlert" smsKey="notifSmsLoginAlert" form={form} set={setBoolField} />
                  <NotifRow label="Password changed" hint="Confirmation after a successful password change"
                    emailKey="notifEmailPasswordChanged" smsKey="notifSmsPasswordChanged" form={form} set={setBoolField} />

                  <p className="text-[10px] uppercase font-bold text-muted-foreground py-2 pt-4">KYC & Compliance</p>
                  <NotifRow label="KYC documents received" hint="Acknowledgement when KYC is submitted"
                    emailKey="notifEmailKycUnderReview" smsKey="notifSmsKycUnderReview" form={form} set={setBoolField} />
                  <NotifRow label="KYC approved" hint="Client is cleared to trade"
                    emailKey="notifEmailKycApproved" smsKey="notifSmsKycApproved" form={form} set={setBoolField} />
                  <NotifRow label="KYC rejected / needs action" hint="KYC documents require resubmission"
                    emailKey="notifEmailKycRejected" smsKey="notifSmsKycRejected" form={form} set={setBoolField} />

                  <p className="text-[10px] uppercase font-bold text-muted-foreground py-2 pt-4">Trading</p>
                  <NotifRow label="Order placed confirmation" hint="When a client successfully places an order on NGX"
                    emailKey="notifEmailOrderPlaced" smsKey="notifSmsOrderPlaced" form={form} set={setBoolField} />
                  <NotifRow label="Order filled / executed" hint="When a buy or sell order is matched and filled"
                    emailKey="notifEmailOrderFilled" smsKey="notifSmsOrderFilled" form={form} set={setBoolField} />
                  <NotifRow label="Order cancelled" hint="When an order expires or is cancelled"
                    emailKey="notifEmailOrderCancelled" smsKey="notifSmsOrderCancelled" form={form} set={setBoolField} />

                  <p className="text-[10px] uppercase font-bold text-muted-foreground py-2 pt-4">Funds</p>
                  <NotifRow label="Deposit confirmed" hint="When a deposit is verified and credited to the account"
                    emailKey="notifEmailDepositConfirmed" smsKey="notifSmsDepositConfirmed" form={form} set={setBoolField} />
                  <NotifRow label="Withdrawal request received" hint="Acknowledgement of a withdrawal request"
                    emailKey="notifEmailWithdrawalRequested" smsKey="notifSmsWithdrawalRequested" form={form} set={setBoolField} />
                  <NotifRow label="Withdrawal processed" hint="When funds are disbursed to the client's bank"
                    emailKey="notifEmailWithdrawalProcessed" smsKey="notifSmsWithdrawalProcessed" form={form} set={setBoolField} />

                  <p className="text-[10px] uppercase font-bold text-muted-foreground py-2 pt-4">Scheduled Reports</p>
                  <NotifRow label="Daily portfolio statement" hint="End-of-day email with portfolio summary (requires scheduled job)"
                    emailKey="notifEmailDailyStatement" form={form} set={setBoolField} emailOnly />
                  <NotifRow label="Weekly activity report" hint="Weekly digest of trades, P&L, and account activity"
                    emailKey="notifEmailWeeklyReport" form={form} set={setBoolField} emailOnly />
                </div>
              </div>
            )}

            {/* ── EMAIL TEMPLATES TAB ── */}
            {tab === 'email-tpl' && (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Templates support <strong className="text-foreground">Mustache-style variables</strong> shown on each card.
                    All templates also have access to: <code className="text-primary text-[10px] bg-primary/10 px-1 rounded">appName</code>, <code className="text-primary text-[10px] bg-primary/10 px-1 rounded">appUrl</code>, <code className="text-primary text-[10px] bg-primary/10 px-1 rounded">supportEmail</code>, <code className="text-primary text-[10px] bg-primary/10 px-1 rounded">supportPhone</code>.
                  </p>
                </div>
                <TemplatePair label="Welcome Email" subjectKey="tplWelcomeSubject" bodyKey="tplWelcomeBody"
                  vars={['fullName', 'appUrl', 'supportEmail']} form={form} set={(k, v) => set(k, v)} />
                <TemplatePair label="Password Reset" subjectKey="tplPasswordResetSubject" bodyKey="tplPasswordResetBody"
                  vars={['fullName', 'resetLink']} form={form} set={(k, v) => set(k, v)} />
                <TemplatePair label="Login Alert (new device)" subjectKey="tplLoginAlertSubject" bodyKey="tplLoginAlertBody"
                  vars={['fullName', 'deviceInfo', 'location', 'loginTime']} form={form} set={(k, v) => set(k, v)} />
                <TemplatePair label="Password Changed" subjectKey="tplPasswordChangedSubject" bodyKey="tplPasswordChangedBody"
                  vars={['fullName', 'changedAt']} form={form} set={(k, v) => set(k, v)} />
                <TemplatePair label="KYC Under Review" subjectKey="tplKycUnderReviewSubject" bodyKey="tplKycUnderReviewBody"
                  vars={['fullName']} form={form} set={(k, v) => set(k, v)} />
                <TemplatePair label="KYC Approved" subjectKey="tplKycApprovedSubject" bodyKey="tplKycApprovedBody"
                  vars={['fullName', 'kycTier', 'tradingLimit']} form={form} set={(k, v) => set(k, v)} />
                <TemplatePair label="KYC Rejected" subjectKey="tplKycRejectedSubject" bodyKey="tplKycRejectedBody"
                  vars={['fullName', 'rejectionReason', 'complianceEmail']} form={form} set={(k, v) => set(k, v)} />
                <TemplatePair label="Order Placed" subjectKey="tplOrderPlacedSubject" bodyKey="tplOrderPlacedBody"
                  vars={['fullName', 'symbol', 'side', 'orderType', 'quantity', 'orderId']} form={form} set={(k, v) => set(k, v)} />
                <TemplatePair label="Order Filled" subjectKey="tplOrderFilledSubject" bodyKey="tplOrderFilledBody"
                  vars={['fullName', 'symbol', 'side', 'quantity', 'fillPrice', 'totalValue', 'brokerageFee', 'netAmount', 'settlementDate']} form={form} set={(k, v) => set(k, v)} />
                <TemplatePair label="Deposit Confirmed" subjectKey="tplDepositConfirmedSubject" bodyKey="tplDepositConfirmedBody"
                  vars={['fullName', 'amount', 'reference', 'depositDate', 'newBalance']} form={form} set={(k, v) => set(k, v)} />
                <TemplatePair label="Withdrawal Processed" subjectKey="tplWithdrawalProcessedSubject" bodyKey="tplWithdrawalProcessedBody"
                  vars={['fullName', 'amount', 'bankName', 'accountNumber', 'reference', 'processedDate']} form={form} set={(k, v) => set(k, v)} />
              </div>
            )}

            {/* ── SMS TEMPLATES TAB ── */}
            {tab === 'sms-tpl' && (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    SMS templates are plain text. Keep each message under 160 characters for a single SMS credit.
                    The character count and SMS segment estimate is shown on each template.
                  </p>
                </div>
                <SmsTemplatePair label="Verification OTP" bodyKey="tplSmsOtp"
                  vars={['otp', 'validityMins']} form={form} set={(k, v) => set(k, v)} />
                <SmsTemplatePair label="Login OTP (2FA)" bodyKey="tplSmsLoginOtp"
                  vars={['otp', 'validityMins']} form={form} set={(k, v) => set(k, v)} />
                <SmsTemplatePair label="Login Alert (new device)" bodyKey="tplSmsLoginAlert"
                  vars={['supportPhone']} form={form} set={(k, v) => set(k, v)} />
                <SmsTemplatePair label="KYC Approved" bodyKey="tplSmsKycApproved"
                  vars={['appUrl']} form={form} set={(k, v) => set(k, v)} />
                <SmsTemplatePair label="KYC Rejected" bodyKey="tplSmsKycRejected"
                  vars={['appUrl']} form={form} set={(k, v) => set(k, v)} />
                <SmsTemplatePair label="KYC Under Review" bodyKey="tplSmsKycUnderReview"
                  form={form} set={(k, v) => set(k, v)} />
                <SmsTemplatePair label="Order Filled" bodyKey="tplSmsOrderFilled"
                  vars={['side', 'quantity', 'symbol', 'fillPrice', 'totalValue', 'appUrl']} form={form} set={(k, v) => set(k, v)} />
                <SmsTemplatePair label="Deposit Confirmed" bodyKey="tplSmsDepositConfirmed"
                  vars={['amount', 'newBalance']} form={form} set={(k, v) => set(k, v)} />
                <SmsTemplatePair label="Withdrawal Processed" bodyKey="tplSmsWithdrawalProcessed"
                  vars={['amount', 'bankName', 'reference']} form={form} set={(k, v) => set(k, v)} />
              </div>
            )}

          </div>
        </div>
      )}
    </AdminLayout>
  )
}
