import { LifeBuoy, MessageCircle, Phone, BookOpen } from 'lucide-react'
import DashboardSidebar from '@/components/dashboard-sidebar'

const FAQ_ITEMS = [
  {
    question: 'How do I top up my account?',
    answer: 'Visit the Funds page and choose Deposit. Your bank transfer instructions will appear immediately.',
  },
  {
    question: 'How long does KYC verification take?',
    answer: 'KYC is usually reviewed within 1 business day. We will notify you as soon as it is complete.',
  },
  {
    question: 'Can I cancel an order after submission?',
    answer: 'Pending orders may be canceled before execution. Check your Orders page for cancel options.',
  },
]

export default function HelpPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 md:ml-56 overflow-auto pb-24 md:pb-0">
        <div className="p-4 md:p-8">
          <div className="mb-8 rounded-[2rem] border border-[#0ecb81]/15 bg-gradient-to-br from-[#0b0e11] via-[#121820]/70 to-[#111821] p-8 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.65)] backdrop-blur-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-[#0ecb81]/80">Help & support</p>
                <h1 className="mt-3 text-3xl md:text-4xl font-bold text-foreground">Fast, trusted support</h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Need assistance? Access our knowledge base, ticket support, or contact a representative directly.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-3xl border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-4 py-3 text-sm font-semibold text-[#0ecb81]">
                <LifeBuoy className="w-4 h-4" /> Support center
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-[#0ecb81]" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Open a ticket</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Submit a support request and track responses in real time.</p>
                </div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#0ecb81]" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Live contact</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Call or email support for urgent account and trade questions.</p>
                </div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-[#0ecb81]" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Knowledge base</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Browse guides on trading, funding, and account security.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
            <h2 className="text-xl font-semibold text-foreground">Frequently asked questions</h2>
            <div className="mt-6 space-y-4">
              {FAQ_ITEMS.map((item) => (
                <div key={item.question} className="rounded-3xl border border-[#0ecb81]/10 bg-[#111821]/80 p-4">
                  <p className="text-sm font-semibold text-foreground">{item.question}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
