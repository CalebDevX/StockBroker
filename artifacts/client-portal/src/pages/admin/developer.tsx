import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Terminal, Key, Eye, EyeOff, CheckCircle2, AlertTriangle,
  Brain, MessageSquare, Mail, Radio, ShieldCheck, RefreshCw,
} from 'lucide-react'
import AdminLayout from '@/components/admin-layout'
import { adminApi } from '@/lib/api'

interface DevKeys {
  gemini_api_key?: string
  achek_api_key?: string
  achek_api_url?: string
  twilio_account_sid?: string
  twilio_auth_token?: string
  twilio_from_number?: string
  sendgrid_api_key?: string
  smtp_host?: string
  smtp_port?: string
  smtp_user?: string
  smtp_pass?: string
  smtp_secure?: string
  cscs_api_url?: string
  cscs_api_key?: string
  cscs_broker_code?: string
  cscs_webhook_secret?: string
  fix_host?: string
  fix_port?: string
  fix_sender_comp_id?: string
  fix_target_comp_id?: string
  fix_password?: string
}

function mask(val: string | undefined): string {
  if (!val) return ''
  if (val.length <= 6) return '••••••'
  return '••••' + val.slice(-4)
}

function KeyField({
  label, field, value, show, onToggle, onChange, placeholder, hint,
}: {
  label: string
  field: string
  value: string
  show: boolean
  onToggle: () => void
  onChange: (val: string) => void
  placeholder?: string
  hint?: string
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase">{label}</label>
      <div className="mt-1.5 flex gap-1.5">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'Enter value…'}
          className="flex-1 px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
        />
        <button
          type="button"
          onClick={onToggle}
          className="px-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground/70 mt-1">{hint}</p>}
    </div>
  )
}

export default function AdminDeveloper() {
  const qc = useQueryClient()
  const [form, setForm] = useState<DevKeys>({})
  const [showMap, setShowMap] = useState<Record<string, boolean>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dev-keys'],
    queryFn: () => adminApi.getDevKeys(),
  })

  useEffect(() => {
    if (!data) return
    const keys = (data as any).keys as DevKeys ?? {}
    setForm(keys)
  }, [data])

  const saveMut = useMutation({
    mutationFn: (keys: DevKeys) => adminApi.saveDevKeys(keys),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-dev-keys'] }),
  })

  const set = (field: keyof DevKeys) => (val: string) => setForm((f) => ({ ...f, [field]: val }))
  const toggle = (field: string) => setShowMap((m) => ({ ...m, [field]: !m[field] }))
  const show = (field: string) => showMap[field] ?? false

  const Section = ({
    icon: Icon, title, description, children, color = 'primary',
  }: {
    icon: React.FC<{ className?: string }>
    title: string
    description: string
    children: React.ReactNode
    color?: string
  }) => (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className={`w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">{children}</div>
    </div>
  )

  return (
    <AdminLayout
      title="Developer Panel"
      subtitle="API keys and integration credentials — stored securely in the database"
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 leading-relaxed">
              Keys saved here are stored in the database and used by the server. Environment variables take priority if set.
              Never share or expose these keys publicly.
            </p>
          </div>

          <Section
            icon={Brain}
            title="AI — Gemini"
            description="Powers the support chatbot. Get a key from Google AI Studio (aistudio.google.com)."
          >
            <KeyField
              label="Gemini API Key"
              field="gemini_api_key"
              value={form.gemini_api_key ?? ''}
              show={show('gemini_api_key')}
              onToggle={() => toggle('gemini_api_key')}
              onChange={set('gemini_api_key')}
              placeholder="AIza..."
              hint="Required for the AI support chatbot. Without it, the bot uses keyword matching."
            />
            <div className="flex items-end">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                The support bot uses <strong className="text-foreground">gemini-1.5-flash</strong>.
                Leave blank to use the built-in keyword fallback instead.
              </p>
            </div>
          </Section>

          <Section
            icon={MessageSquare}
            title="SMS & OTP — Achek"
            description="Nigerian SMS provider for OTP codes and transactional alerts. achek.com.ng"
          >
            <KeyField
              label="Achek API Key"
              field="achek_api_key"
              value={form.achek_api_key ?? ''}
              show={show('achek_api_key')}
              onToggle={() => toggle('achek_api_key')}
              onChange={set('achek_api_key')}
              placeholder="achek_live_..."
              hint="Required to send OTP and SMS alerts via Achek."
            />
            <KeyField
              label="Achek API URL"
              field="achek_api_url"
              value={form.achek_api_url ?? ''}
              show={show('achek_api_url')}
              onToggle={() => toggle('achek_api_url')}
              onChange={set('achek_api_url')}
              placeholder="https://api.achek.com.ng"
              hint="Default: https://api.achek.com.ng"
            />
          </Section>

          <Section
            icon={MessageSquare}
            title="SMS — Twilio"
            description="Alternative SMS provider for OTP and notifications. twilio.com"
          >
            <KeyField
              label="Account SID"
              field="twilio_account_sid"
              value={form.twilio_account_sid ?? ''}
              show={show('twilio_account_sid')}
              onToggle={() => toggle('twilio_account_sid')}
              onChange={set('twilio_account_sid')}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <KeyField
              label="Auth Token"
              field="twilio_auth_token"
              value={form.twilio_auth_token ?? ''}
              show={show('twilio_auth_token')}
              onToggle={() => toggle('twilio_auth_token')}
              onChange={set('twilio_auth_token')}
              placeholder="your auth token"
            />
            <KeyField
              label="From Number"
              field="twilio_from_number"
              value={form.twilio_from_number ?? ''}
              show={show('twilio_from_number')}
              onToggle={() => toggle('twilio_from_number')}
              onChange={set('twilio_from_number')}
              placeholder="+2348012345678"
              hint="The Twilio phone number to send SMS from."
            />
          </Section>

          <Section
            icon={Mail}
            title="Email — SendGrid"
            description="Transactional email for KYC notifications and password resets. sendgrid.com"
          >
            <KeyField
              label="SendGrid API Key"
              field="sendgrid_api_key"
              value={form.sendgrid_api_key ?? ''}
              show={show('sendgrid_api_key')}
              onToggle={() => toggle('sendgrid_api_key')}
              onChange={set('sendgrid_api_key')}
              placeholder="SG.xxxxxxxx..."
              hint="Required when email provider is set to SendGrid in Settings."
            />
          </Section>

          <Section
            icon={Mail}
            title="Email — SMTP"
            description="Custom SMTP or Brevo for email delivery. Works with most transactional email services."
          >
            <KeyField
              label="SMTP Host"
              field="smtp_host"
              value={form.smtp_host ?? ''}
              show={show('smtp_host')}
              onToggle={() => toggle('smtp_host')}
              onChange={set('smtp_host')}
              placeholder="smtp-relay.brevo.com"
            />
            <KeyField
              label="SMTP Port"
              field="smtp_port"
              value={form.smtp_port ?? ''}
              show={show('smtp_port')}
              onToggle={() => toggle('smtp_port')}
              onChange={set('smtp_port')}
              placeholder="587"
            />
            <KeyField
              label="SMTP Username"
              field="smtp_user"
              value={form.smtp_user ?? ''}
              show={show('smtp_user')}
              onToggle={() => toggle('smtp_user')}
              onChange={set('smtp_user')}
              placeholder="apikey or your email"
            />
            <KeyField
              label="SMTP Password"
              field="smtp_pass"
              value={form.smtp_pass ?? ''}
              show={show('smtp_pass')}
              onToggle={() => toggle('smtp_pass')}
              onChange={set('smtp_pass')}
              placeholder="smtp password or API key"
            />
          </Section>

          <Section
            icon={ShieldCheck}
            title="CSCS A2A API"
            description="Central Securities Clearing System — for live portfolio synchronisation and settlement."
          >
            <KeyField
              label="CSCS API URL"
              field="cscs_api_url"
              value={form.cscs_api_url ?? ''}
              show={show('cscs_api_url')}
              onToggle={() => toggle('cscs_api_url')}
              onChange={set('cscs_api_url')}
              placeholder="https://api.cscs.ng"
            />
            <KeyField
              label="CSCS API Key"
              field="cscs_api_key"
              value={form.cscs_api_key ?? ''}
              show={show('cscs_api_key')}
              onToggle={() => toggle('cscs_api_key')}
              onChange={set('cscs_api_key')}
              placeholder="cscs_live_..."
            />
            <KeyField
              label="CSCS Broker Code"
              field="cscs_broker_code"
              value={form.cscs_broker_code ?? ''}
              show={show('cscs_broker_code')}
              onToggle={() => toggle('cscs_broker_code')}
              onChange={set('cscs_broker_code')}
              placeholder="0001"
            />
            <KeyField
              label="Webhook Secret"
              field="cscs_webhook_secret"
              value={form.cscs_webhook_secret ?? ''}
              show={show('cscs_webhook_secret')}
              onToggle={() => toggle('cscs_webhook_secret')}
              onChange={set('cscs_webhook_secret')}
              placeholder="webhook signing secret"
              hint="Used to verify incoming CSCS webhook signatures."
            />
          </Section>

          <Section
            icon={Radio}
            title="NGX ATS — FIX 4.4 Session"
            description="Nigerian Exchange Group ATS connection for live order routing. Required for LIVE trading mode."
          >
            <KeyField
              label="FIX Host"
              field="fix_host"
              value={form.fix_host ?? ''}
              show={show('fix_host')}
              onToggle={() => toggle('fix_host')}
              onChange={set('fix_host')}
              placeholder="ats.ngxgroup.com"
            />
            <KeyField
              label="FIX Port"
              field="fix_port"
              value={form.fix_port ?? ''}
              show={show('fix_port')}
              onToggle={() => toggle('fix_port')}
              onChange={set('fix_port')}
              placeholder="4849"
            />
            <KeyField
              label="Sender Comp ID"
              field="fix_sender_comp_id"
              value={form.fix_sender_comp_id ?? ''}
              show={show('fix_sender_comp_id')}
              onToggle={() => toggle('fix_sender_comp_id')}
              onChange={set('fix_sender_comp_id')}
              placeholder="Your broker FIX ID"
              hint="Assigned by NGX. Your broker's FIX session identifier."
            />
            <KeyField
              label="Target Comp ID"
              field="fix_target_comp_id"
              value={form.fix_target_comp_id ?? ''}
              show={show('fix_target_comp_id')}
              onToggle={() => toggle('fix_target_comp_id')}
              onChange={set('fix_target_comp_id')}
              placeholder="NGXATS"
            />
            <KeyField
              label="FIX Password"
              field="fix_password"
              value={form.fix_password ?? ''}
              show={show('fix_password')}
              onToggle={() => toggle('fix_password')}
              onChange={set('fix_password')}
              placeholder="FIX session password"
            />
          </Section>

          <div className="flex items-center justify-between">
            <div>
              {saveMut.isSuccess && (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Saved successfully.
                </div>
              )}
              {saveMut.isError && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertTriangle className="w-4 h-4" /> Save failed — try again.
                </div>
              )}
            </div>
            <button
              onClick={() => saveMut.mutate(form)}
              disabled={saveMut.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
            >
              <Key className="w-4 h-4" />
              {saveMut.isPending ? 'Saving…' : 'Save API Keys'}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
