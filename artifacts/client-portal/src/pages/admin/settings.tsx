import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings2, Mail, MessageSquare, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react'
import AdminLayout from '@/components/admin-layout'
import { adminApi } from '@/lib/api'

const emailProviders = [
  { value: 'console', label: 'Console / disabled' },
  { value: 'sendgrid', label: 'SendGrid' },
  { value: 'smtp', label: 'SMTP / custom mail server' },
] as const

const smsProviders = [
  { value: 'console', label: 'Console / disabled' },
  { value: 'twilio', label: 'Twilio' },
  { value: 'achek', label: 'Achek' },
] as const

interface SettingsForm {
  emailProvider: string
  emailFrom: string
  emailSupport: string
  appName: string
  appUrl: string
  smsProvider: string
  smsFrom: string
  passwordResetSubject: string
  passwordResetBody: string
  kycApprovedSubject: string
  kycApprovedBody: string
  kycRejectedSubject: string
  kycRejectedBody: string
  kycUnderReviewSubject: string
  kycUnderReviewBody: string
  smsKycApproved: string
  smsKycRejected: string
  smsKycUnderReview: string
}

const defaultForm: SettingsForm = {
  emailProvider: 'console',
  emailFrom: 'noreply@stockbroker.ng',
  emailSupport: 'support@stockbroker.ng',
  appName: 'StockBroker NG',
  appUrl: 'https://app.stockbroker.ng',
  smsProvider: 'console',
  smsFrom: '+2340000000000',
  passwordResetSubject: 'Reset your StockBroker password',
  passwordResetBody:
    'Hello {{fullName}},\n\nA password reset request was received for your StockBroker account.\n\nReset your password using the link below:\n{{resetLink}}\n\nIf you did not request this, contact {{supportEmail}}.\n\nThank you,\nStockBroker NG',
  kycApprovedSubject: 'Your StockBroker KYC is approved',
  kycApprovedBody:
    'Hello {{fullName}},\n\nGood news — your KYC has been approved. Your account is now cleared for trading.\nVisit {{appUrl}} to continue.\n\nThank you,\nStockBroker NG',
  kycRejectedSubject: 'StockBroker KYC review requires action',
  kycRejectedBody:
    'Hello {{fullName}},\n\nYour KYC review is not complete. Please update your documents or contact support at {{supportEmail}}.\n\nThank you,\nStockBroker NG',
  kycUnderReviewSubject: 'StockBroker KYC submission received',
  kycUnderReviewBody:
    'Hello {{fullName}},\n\nWe received your KYC submission and our compliance team is reviewing it. We will notify you once the review is complete.\n\nThank you,\nStockBroker NG',
  smsKycApproved: 'Your StockBroker KYC is approved. You may now trade on the platform.',
  smsKycRejected: 'Your StockBroker KYC requires more information. Please review your submission.',
  smsKycUnderReview: 'Your StockBroker KYC is under review. We will notify you when it is complete.',
}

function normalizeObject(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {}
  return Object.entries(value as Record<string, unknown>).reduce((result, [key, raw]) => {
    result[key] = typeof raw === 'string' ? raw : String(raw ?? '')
    return result
  }, {} as Record<string, string>)
}

export default function AdminSettings() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSettings(),
  })

  const [form, setForm] = useState<SettingsForm>(defaultForm)

  useEffect(() => {
    if (!data) return
    const settings = data.settings ?? {}
    const emailSettings = normalizeObject(settings.email_provider)
    const smsSettings = normalizeObject(settings.sms_provider)
    const emailTemplates = normalizeObject(settings.email_templates)
    const smsTemplates = normalizeObject(settings.sms_templates)

    setForm({
      emailProvider: emailSettings.provider || defaultForm.emailProvider,
      emailFrom: emailSettings.fromEmail || defaultForm.emailFrom,
      emailSupport: emailSettings.supportEmail || defaultForm.emailSupport,
      appName: typeof settings.app_name === 'string' ? settings.app_name : defaultForm.appName,
      appUrl: typeof settings.app_url === 'string' ? settings.app_url : defaultForm.appUrl,
      smsProvider: smsSettings.provider || defaultForm.smsProvider,
      smsFrom: smsSettings.fromNumber || defaultForm.smsFrom,
      passwordResetSubject: emailTemplates.passwordResetSubject || defaultForm.passwordResetSubject,
      passwordResetBody: emailTemplates.passwordResetBody || defaultForm.passwordResetBody,
      kycApprovedSubject: emailTemplates.kycApprovedSubject || defaultForm.kycApprovedSubject,
      kycApprovedBody: emailTemplates.kycApprovedBody || defaultForm.kycApprovedBody,
      kycRejectedSubject: emailTemplates.kycRejectedSubject || defaultForm.kycRejectedSubject,
      kycRejectedBody: emailTemplates.kycRejectedBody || defaultForm.kycRejectedBody,
      kycUnderReviewSubject: emailTemplates.kycUnderReviewSubject || defaultForm.kycUnderReviewSubject,
      kycUnderReviewBody: emailTemplates.kycUnderReviewBody || defaultForm.kycUnderReviewBody,
      smsKycApproved: smsTemplates.kycApproved || defaultForm.smsKycApproved,
      smsKycRejected: smsTemplates.kycRejected || defaultForm.smsKycRejected,
      smsKycUnderReview: smsTemplates.kycUnderReview || defaultForm.smsKycUnderReview,
    })
  }, [data])

  const updateMutation = useMutation({
    mutationFn: (settings: Record<string, unknown>) => adminApi.updateSettings(settings),
    onSuccess: () => {
      ;(qc.invalidateQueries as any)(['admin-settings'])
    },
  })

  const onChange = (field: keyof SettingsForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const saveSettings = async () => {
    await updateMutation.mutateAsync({
      email_provider: {
        provider: form.emailProvider,
        fromEmail: form.emailFrom,
        supportEmail: form.emailSupport,
      },
      sms_provider: {
        provider: form.smsProvider,
        fromNumber: form.smsFrom,
      },
      app_name: form.appName,
      app_url: form.appUrl,
      email_templates: {
        passwordResetSubject: form.passwordResetSubject,
        passwordResetBody: form.passwordResetBody,
        kycApprovedSubject: form.kycApprovedSubject,
        kycApprovedBody: form.kycApprovedBody,
        kycRejectedSubject: form.kycRejectedSubject,
        kycRejectedBody: form.kycRejectedBody,
        kycUnderReviewSubject: form.kycUnderReviewSubject,
        kycUnderReviewBody: form.kycUnderReviewBody,
      },
      sms_templates: {
        kycApproved: form.smsKycApproved,
        kycRejected: form.smsKycRejected,
        kycUnderReview: form.smsKycUnderReview,
      },
    })
  }

  return (
    <AdminLayout title="Settings" subtitle="Manage email, SMS, and platform notification defaults">
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Settings2 className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-foreground">Notification Providers</h2>
                <p className="text-xs text-muted-foreground">Provider credentials are configured with environment variables; templates and default senders are stored here.</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Email provider</label>
                <select
                  value={form.emailProvider}
                  onChange={(event) => onChange('emailProvider', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {emailProviders.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Set <code className="rounded bg-muted px-1">EMAIL_PROVIDER</code> and credentials in the backend environment.
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Platform name</label>
                <input
                  type="text"
                  value={form.appName}
                  onChange={(event) => onChange('appName', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="StockBroker NG"
                />
                <p className="text-[10px] text-muted-foreground mt-2">
                  The name used in OTP and notification templates via <code className="rounded bg-muted px-1">{'{{appName}}'}</code>.
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Platform URL</label>
                <input
                  type="url"
                  value={form.appUrl}
                  onChange={(event) => onChange('appUrl', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="https://app.stockbroker.ng"
                />
                <p className="text-[10px] text-muted-foreground mt-2">
                  Used in notification templates and password reset links via <code className="rounded bg-muted px-1">{'{{appUrl}}'}</code>.
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">SMS provider</label>
                <select
                  value={form.smsProvider}
                  onChange={(event) => onChange('smsProvider', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {smsProviders.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Set <code className="rounded bg-muted px-1">SMS_PROVIDER</code> and provider API keys in the backend environment.
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 mt-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Email sender</label>
                <input
                  value={form.emailFrom}
                  onChange={(event) => onChange('emailFrom', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Support email</label>
                <input
                  value={form.emailSupport}
                  onChange={(event) => onChange('emailSupport', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 mt-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">SMS sender</label>
                <input
                  value={form.smsFrom}
                  onChange={(event) => onChange('smsFrom', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Provider hints</p>
                <div className="text-[10px] text-muted-foreground">
                  <p>SMTP (Brevo works here): <code className="rounded bg-muted px-1">SMTP_HOST</code>, <code className="rounded bg-muted px-1">SMTP_PORT</code>, <code className="rounded bg-muted px-1">SMTP_USER</code>, <code className="rounded bg-muted px-1">SMTP_PASS</code>, <code className="rounded bg-muted px-1">SMTP_SECURE</code></p>
                  <p>Twilio: <code className="rounded bg-muted px-1">TWILIO_ACCOUNT_SID</code>, <code className="rounded bg-muted px-1">TWILIO_AUTH_TOKEN</code>, <code className="rounded bg-muted px-1">SMS_FROM_NUMBER</code></p>
                  <p>Achek: <code className="rounded bg-muted px-1">ACHEK_API_KEY</code></p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-foreground">Email templates</h2>
                <p className="text-xs text-muted-foreground">Customize subjects and body text for password reset and KYC notifications.</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Password reset subject</label>
                <input
                  value={form.passwordResetSubject}
                  onChange={(event) => onChange('passwordResetSubject', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Password reset body</label>
                <textarea
                  rows={5}
                  value={form.passwordResetBody}
                  onChange={(event) => onChange('passwordResetBody', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">KYC approved subject</label>
                  <input
                    value={form.kycApprovedSubject}
                    onChange={(event) => onChange('kycApprovedSubject', event.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">KYC rejected subject</label>
                  <input
                    value={form.kycRejectedSubject}
                    onChange={(event) => onChange('kycRejectedSubject', event.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">KYC approved body</label>
                <textarea
                  rows={4}
                  value={form.kycApprovedBody}
                  onChange={(event) => onChange('kycApprovedBody', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">KYC rejected body</label>
                <textarea
                  rows={4}
                  value={form.kycRejectedBody}
                  onChange={(event) => onChange('kycRejectedBody', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">KYC under-review subject</label>
                <input
                  value={form.kycUnderReviewSubject}
                  onChange={(event) => onChange('kycUnderReviewSubject', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">KYC under-review body</label>
                <textarea
                  rows={4}
                  value={form.kycUnderReviewBody}
                  onChange={(event) => onChange('kycUnderReviewBody', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-foreground">SMS templates</h2>
                <p className="text-xs text-muted-foreground">Notify clients by SMS when their KYC status changes.</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">KYC approved SMS</label>
                <textarea
                  rows={3}
                  value={form.smsKycApproved}
                  onChange={(event) => onChange('smsKycApproved', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">KYC rejected SMS</label>
                <textarea
                  rows={3}
                  value={form.smsKycRejected}
                  onChange={(event) => onChange('smsKycRejected', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">KYC under-review SMS</label>
                <textarea
                  rows={3}
                  value={form.smsKycUnderReview}
                  onChange={(event) => onChange('smsKycUnderReview', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              {updateMutation.isSuccess && (
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-emerald-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Saved successfully.
                </div>
              )}
              {updateMutation.isError && (
                <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-4 py-2 text-rose-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Failed to save settings. Try again.
                </div>
              )}
            </div>
            <button
              onClick={saveSettings}
              disabled={(updateMutation as any).isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShieldCheck className="w-4 h-4" />
              {(updateMutation as any).isLoading ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
