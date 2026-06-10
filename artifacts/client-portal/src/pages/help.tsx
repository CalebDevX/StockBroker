import { useState } from 'react'
import { LifeBuoy, MessageCircle, Phone, BookOpen, ChevronDown, ChevronUp, Mail, ExternalLink } from 'lucide-react'
import DashboardSidebar from '@/components/dashboard-sidebar'

const FAQ_ITEMS = [
  {
    question: 'How do I fund my trading account?',
    answer: 'Go to Funds → Deposit. Transfer to the broker nominee account shown there. Use your full registered name as the payment narration so we can match your deposit. Accounts are typically credited within 1 business day after bank confirmation.',
  },
  {
    question: 'How long does KYC verification take?',
    answer: 'KYC submissions are reviewed within 1 business day. You will receive a notification once your status is updated. If additional documents are needed, our compliance team will contact you directly.',
  },
  {
    question: 'Can I cancel an order after submission?',
    answer: 'Pending orders can be cancelled before they are matched on the NGX. Go to Orders, find the pending order, and tap Cancel. Once an order is fully filled it cannot be reversed — contact support immediately if you believe an error occurred.',
  },
  {
    question: 'What is the settlement cycle?',
    answer: 'NGX operates on a T+2 settlement cycle. This means trades are settled two business days after execution. Your cash balance reflects the settled position; equity positions are visible immediately after a fill.',
  },
  {
    question: 'What fees does the broker charge?',
    answer: 'Brokerage fees are charged per trade in line with SEC-approved rates. VAT at 7.5% is applied to brokerage fees as required. Exact fee breakdowns are shown on your contract note and in the Reports page after each transaction.',
  },
  {
    question: 'How do I withdraw my funds?',
    answer: 'Go to Funds → Withdraw. Enter the amount and your destination bank details. Withdrawals follow T+2 settlement rules and are processed within 1–3 business days. Only fully settled cash is available for withdrawal.',
  },
  {
    question: 'What is CSCS and why does it matter?',
    answer: 'The Central Securities Clearing System (CSCS) is Nigeria\'s central depository for equities traded on the NGX. All shares you buy are held in your CSCS account, which is linked to your CHN (Central Securities Clearing House Number). Your KYC process includes verifying your CHN.',
  },
  {
    question: 'How do I read my portfolio statement?',
    answer: 'Visit the Reports page to view your full transaction history and download a CSV statement. The Portfolio page shows your live positions, sector allocation, and unrealised P&L in real time.',
  },
]

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      onClick={() => setOpen(v => !v)}
      className="w-full text-left rounded-[1.5rem] border border-[#0ecb81]/10 bg-[#111821]/80 p-4 transition hover:border-[#0ecb81]/20"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{question}</p>
        {open
          ? <ChevronUp className="w-4 h-4 text-[#0ecb81] shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        }
      </div>
      {open && (
        <p className="mt-3 text-sm leading-6 text-muted-foreground border-t border-border/40 pt-3">
          {answer}
        </p>
      )}
    </button>
  )
}

export default function HelpPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 md:ml-56 overflow-auto pb-24 md:pb-0">
        <div className="p-4 md:p-8">

          {/* Header */}
          <div className="mb-8 rounded-[2rem] border border-[#0ecb81]/15 bg-gradient-to-br from-[#0b0e11] via-[#121820]/70 to-[#111821] p-6 md:p-8 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.65)] backdrop-blur-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-[#0ecb81]/80">Help & support</p>
                <h1 className="mt-3 text-3xl md:text-4xl font-bold text-foreground">How can we help?</h1>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                  Find answers in our FAQ or reach the support team directly.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-3xl border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-4 py-3 text-sm font-semibold text-[#0ecb81]">
                <LifeBuoy className="w-4 h-4" /> Support center
              </div>
            </div>
          </div>

          {/* Contact cards */}
          <div className="grid gap-4 lg:grid-cols-3 mb-8">
            <a
              href="mailto:support@stockbrokerng.com"
              className="group rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)] transition hover:border-[#0ecb81]/30 hover:bg-[#0ecb81]/5 block"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0ecb81]/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-[#0ecb81]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Email support</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Send a message and get a response within 1 business day.</p>
                  <p className="mt-3 text-sm font-medium text-[#0ecb81] flex items-center gap-1">
                    support@stockbrokerng.com <ExternalLink className="w-3 h-3" />
                  </p>
                </div>
              </div>
            </a>

            <a
              href="tel:+2340000000000"
              className="group rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)] transition hover:border-[#0ecb81]/30 hover:bg-[#0ecb81]/5 block"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0ecb81]/10 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-[#0ecb81]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Phone support</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Speak to a broker. Available Mon–Fri, 8 AM–5 PM WAT.</p>
                  <p className="mt-3 text-sm font-medium text-[#0ecb81] flex items-center gap-1">
                    +234 000 000 0000 <ExternalLink className="w-3 h-3" />
                  </p>
                </div>
              </div>
            </a>

            <a
              href="https://wa.me/2340000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)] transition hover:border-[#0ecb81]/30 hover:bg-[#0ecb81]/5 block"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0ecb81]/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-[#0ecb81]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">WhatsApp</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Chat with support instantly for quick queries.</p>
                  <p className="mt-3 text-sm font-medium text-[#0ecb81] flex items-center gap-1">
                    Open WhatsApp <ExternalLink className="w-3 h-3" />
                  </p>
                </div>
              </div>
            </a>
          </div>

          {/* Knowledge base note */}
          <div className="mb-6 rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-5 shadow-[0_20px_40px_-30px_rgba(14,203,129,0.4)] flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#0ecb81]/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-[#0ecb81]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">NGX regulatory resources</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                SEC rules, CSCS guidelines, and CBN investment regulations are available at{' '}
                <a href="https://sec.gov.ng" target="_blank" rel="noopener noreferrer" className="text-[#0ecb81] hover:underline">sec.gov.ng</a>
                {' '}and{' '}
                <a href="https://ngxgroup.com" target="_blank" rel="noopener noreferrer" className="text-[#0ecb81] hover:underline">ngxgroup.com</a>.
              </p>
            </div>
          </div>

          {/* FAQ accordion */}
          <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
            <h2 className="text-xl font-semibold text-foreground mb-5">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item) => (
                <FaqItem key={item.question} question={item.question} answer={item.answer} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
