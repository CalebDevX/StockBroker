import { useLocation } from 'wouter'
import { ArrowLeft } from 'lucide-react'

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-base font-semibold text-foreground mb-3">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
)

export default function PrivacyPage() {
  const [, navigate] = useLocation()
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <button onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-black text-xs">SB</span>
          </div>
          <div>
            <h1 className="text-base font-bold leading-none">StockBroker NG</h1>
            <p className="text-muted-foreground text-xs">Nigerian Exchange — NGX</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-1">Privacy Policy</h1>
        <p className="text-xs text-muted-foreground mb-8">Last updated: June 2026 · Compliant with NDPR 2019</p>

        <Section title="1. Introduction">
          <p>
            StockBroker NG ("we", "our") is committed to protecting your personal data in accordance with the Nigeria Data Protection Regulation (NDPR) 2019 and the Nigeria Data Protection Act (NDPA) 2023. This Policy explains how we collect, use, store, and protect your information.
          </p>
        </Section>

        <Section title="2. Data We Collect">
          <p><strong className="text-foreground">Identity data:</strong> Full name, date of birth, gender, BVN, NIN, passport or national ID.</p>
          <p><strong className="text-foreground">Contact data:</strong> Email address, phone number, residential address.</p>
          <p><strong className="text-foreground">Financial data:</strong> Bank account details, transaction history, portfolio positions, cash balances.</p>
          <p><strong className="text-foreground">Usage data:</strong> Login timestamps, IP addresses, device type, pages visited, order activity.</p>
        </Section>

        <Section title="3. How We Use Your Data">
          <p>We process your data only for lawful purposes, including:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Opening and managing your brokerage account</li>
            <li>KYC/AML identity verification as required by CBN and SEC Nigeria</li>
            <li>Executing and settling your trade orders on the NGX</li>
            <li>Processing deposits, withdrawals, and dividends</li>
            <li>Sending account statements, trade confirmations, and regulatory notices</li>
            <li>Detecting and preventing fraud, market abuse, and financial crime</li>
          </ul>
        </Section>

        <Section title="4. Legal Basis for Processing">
          <p>
            We process your data under the following legal bases: contractual necessity (to perform our services), legal obligation (regulatory compliance with CBN, SEC, FIRS, and NFIU requirements), and legitimate interest (fraud prevention and platform security). Where we rely on consent, you may withdraw it at any time.
          </p>
        </Section>

        <Section title="5. Data Sharing">
          <p>We do not sell your personal data. We share it only with:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The Nigerian Exchange Group (NGX) and CSCS for trade settlement</li>
            <li>Licensed custodian banks for fund processing</li>
            <li>Regulatory bodies (SEC, CBN, NFIU) when required by law</li>
            <li>Our KYC/identity verification partner(s)</li>
            <li>Cloud infrastructure providers under data processing agreements</li>
          </ul>
          <p>All third parties are contractually bound to process data only as instructed and to maintain equivalent security standards.</p>
        </Section>

        <Section title="6. Data Retention">
          <p>
            We retain account and transaction records for a minimum of seven (7) years after account closure, as required by Nigerian financial regulations. KYC documentation is retained for five (5) years or as mandated by the NFIU. You may request deletion of non-regulatory data at any time.
          </p>
        </Section>

        <Section title="7. Your Rights">
          <p>Under the NDPR and NDPA, you have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access a copy of the personal data we hold about you</li>
            <li>Correct inaccurate or incomplete data</li>
            <li>Request deletion of data we are not legally required to retain</li>
            <li>Object to processing based on legitimate interests</li>
            <li>Receive your data in a portable, machine-readable format</li>
            <li>Lodge a complaint with the National Information Technology Development Agency (NITDA)</li>
          </ul>
          <p>To exercise any right, contact <span className="text-accent">privacy@stockbrokerng.com</span>. We will respond within 30 days.</p>
        </Section>

        <Section title="8. Security">
          <p>
            We use AES-256 encryption at rest, TLS 1.3 in transit, multi-factor authentication options, and role-based access controls. Access to your data is restricted to authorised personnel on a need-to-know basis. We conduct periodic security assessments and penetration tests.
          </p>
        </Section>

        <Section title="9. Cookies & Tracking">
          <p>
            We use essential session cookies required for authentication and platform operation. We do not use third-party advertising trackers. Usage analytics are collected in aggregate, anonymised form only.
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We will notify you of material changes to this Policy via email or an in-app notice at least 14 days before they take effect. Continued use of the platform after that date constitutes acceptance of the revised Policy.
          </p>
        </Section>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Data Protection Officer: <span className="text-accent">privacy@stockbrokerng.com</span>
          </p>
        </div>
      </div>
    </div>
  )
}
