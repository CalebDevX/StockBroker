import { useLocation } from 'wouter'
import { ArrowLeft } from 'lucide-react'

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-base font-semibold text-foreground mb-3">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
)

export default function TermsPage() {
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

        <h1 className="text-2xl font-bold text-foreground mb-1">Terms of Service</h1>
        <p className="text-xs text-muted-foreground mb-8">Last updated: June 2026 · Governed by Nigerian law</p>

        <Section title="1. About StockBroker NG">
          <p>
            StockBroker NG is a stockbroking platform authorised by the Securities and Exchange Commission of Nigeria (SEC) and operating under the rules of the Nigerian Exchange Group (NGX). By creating an account and using this platform, you agree to these Terms of Service.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be at least 18 years of age and a resident of Nigeria to open a trading account. Corporate accounts must be duly registered entities under Nigerian law. We reserve the right to decline or terminate any account that does not meet eligibility requirements.
          </p>
        </Section>

        <Section title="3. Account Registration & KYC">
          <p>
            You are required to complete Know Your Customer (KYC) verification — including a valid Bank Verification Number (BVN), National Identification Number (NIN), residential address, and date of birth — before trading real securities. This is a mandatory requirement under the CBN KYC Regulations 2023 and SEC Rules on Investor Protection.
          </p>
          <p>
            You warrant that all information provided is accurate and up to date. Providing false or misleading information is a criminal offence under Nigerian law and will result in immediate account termination.
          </p>
        </Section>

        <Section title="4. Trading & Orders">
          <p>
            All buy and sell orders are executed on the NGX through our Central Securities Clearing System (CSCS) account. Settled funds reflect T+2 from the trade date in line with NGX settlement rules. StockBroker NG is not liable for market fluctuations, price slippage, or execution delays caused by exchange or network conditions.
          </p>
          <p>
            You acknowledge that trading in equities carries inherent risk and that past performance is not indicative of future results. You are solely responsible for your investment decisions.
          </p>
        </Section>

        <Section title="5. Fees & Charges">
          <p>
            Commission rates and applicable charges (SEC levy, NSE fee, CSCS fee, stamp duty) are disclosed at the point of order placement and are subject to regulatory minimums. All fees are charged at the time of trade execution and are non-refundable except in cases of execution error.
          </p>
        </Section>

        <Section title="6. Funds & Withdrawals">
          <p>
            Client funds are held in a segregated account at a licensed Nigerian bank in accordance with SEC Rules on Custody of Client Assets. Withdrawal requests are processed within 1–3 business days, subject to cleared balances and KYC completion.
          </p>
        </Section>

        <Section title="7. Prohibited Conduct">
          <p>
            You may not use the platform to engage in market manipulation, insider trading, wash trading, or any activity prohibited under the Investments and Securities Act (ISA) 2007. Violations will be reported to SEC Nigeria and relevant law enforcement authorities.
          </p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, StockBroker NG's liability for any claim arising from use of this platform is limited to the fees paid by you in the preceding three months. We are not liable for indirect, incidental, or consequential losses.
          </p>
        </Section>

        <Section title="9. Governing Law & Disputes">
          <p>
            These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall first be submitted to mediation under the Lagos Chamber of Commerce and Industry Arbitration Rules before any court proceedings.
          </p>
        </Section>

        <Section title="10. Amendments">
          <p>
            We may update these Terms at any time. Material changes will be communicated via email or in-app notification. Continued use of the platform after such notice constitutes acceptance of the updated Terms.
          </p>
        </Section>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Questions? Contact <span className="text-accent">compliance@stockbrokerng.com</span>
          </p>
        </div>
      </div>
    </div>
  )
}
