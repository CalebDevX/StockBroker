import { useState } from 'react'
import DashboardSidebar from '@/components/dashboard-sidebar'
import {
  ArrowDownToLine, ArrowUpFromLine, Building2,
  CheckCircle2, AlertCircle, Copy, Loader2, Wallet, ArrowRight,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { portfolioApi, fundsApi, fmtKobo, type Transaction } from '@/lib/api'

const BROKER_ACCOUNT = {
  bank: 'Stanbic IBTC Bank',
  accountNo: '0123456789',
  accountName: 'StockBroker NG Nominees',
  sortCode: '221563',
}

type ActiveTab = 'deposit' | 'withdraw'

export default function FundsPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab]     = useState<ActiveTab>('deposit')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [bankName, setBankName]       = useState('')
  const [copied, setCopied]           = useState(false)
  const [feedback, setFeedback]       = useState<{ ok: boolean; msg: string } | null>(null)

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: portfolioApi.summary,
  })
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => portfolioApi.transactions(10),
  })

  const cashKobo = summaryData?.cashBalanceKobo ?? 0
  const txs = txData?.transactions ?? []

  const withdrawMutation = useMutation({
    mutationFn: () => {
      const amountNaira = parseFloat(withdrawAmount)
      return fundsApi.withdraw(amountNaira, bankName || 'My Bank')
    },
    onSuccess: (data) => {
      setFeedback({
        ok: true,
        msg: `Withdrawal of ₦${data.amountNaira.toLocaleString()} requested. Ref: ${data.reference}. Processing in 1–3 business days.`,
      })
      setWithdrawAmount('')
      setBankName('')
      qc.invalidateQueries({ queryKey: ['portfolio-summary'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      setTimeout(() => setFeedback(null), 8000)
    },
    onError: (err) => {
      setFeedback({ ok: false, msg: (err as Error).message })
      setTimeout(() => setFeedback(null), 6000)
    },
  })

  function copyAccNo() {
    navigator.clipboard.writeText(BROKER_ACCOUNT.accountNo)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const withdrawNaira = parseFloat(withdrawAmount) || 0
  const withdrawKobo = Math.round(withdrawNaira * 100)

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-24 md:pb-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Funds</h1>
          <p className="text-muted-foreground text-sm mt-1">Deposit and withdraw from your trading account</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Available Cash',      kobo: cashKobo, sub: 'Ready to trade',     color: 'text-primary'    },
            { label: 'Pending Settlements', kobo: 0,        sub: 'T+2 settlement',     color: 'text-yellow-400' },
            { label: 'Total Withdrawable',  kobo: cashKobo, sub: 'After settlement',   color: 'text-accent'     },
          ].map((card) => (
            <div key={card.label} className="bg-card border border-border rounded-xl p-5">
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">{card.label}</p>
              {summaryLoading
                ? <div className="h-8 w-28 bg-border/50 rounded animate-pulse mt-1" />
                : <p className={`text-2xl font-bold ${card.color}`}>{fmtKobo(card.kobo)}</p>
              }
              <p className="text-muted-foreground text-xs mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {feedback && (
          <div className={`mb-6 flex items-center gap-2 rounded-xl p-4 border ${
            feedback.ok
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {feedback.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <p className="text-sm">{feedback.msg}</p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.7fr_1.3fr] md:gap-6">
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Funding overview</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Your funding balance, account instructions, and withdraw status.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#0ecb81]/20 bg-[#0ecb81]/10 px-3 py-1 text-xs font-semibold text-[#0ecb81]">
                  <Wallet className="w-4 h-4" /> Cash ready
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl bg-[#111821]/80 border border-[#0ecb81]/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Available</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{summaryLoading ? '…' : fmtKobo(cashKobo)}</p>
                </div>
                <div className="rounded-3xl bg-[#111821]/80 border border-[#0ecb81]/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Pending</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">₦0.00</p>
                </div>
                <div className="rounded-3xl bg-[#111821]/80 border border-[#0ecb81]/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Withdrawable</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{summaryLoading ? '…' : fmtKobo(cashKobo)}</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex border-b border-border">
                {(['deposit', 'withdraw'] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}>
                    {tab === 'deposit'
                      ? <><ArrowDownToLine className="w-4 h-4" /> Deposit</>
                      : <><ArrowUpFromLine className="w-4 h-4" /> Withdraw</>
                    }
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeTab === 'deposit' && (
                  <div className="space-y-5">
                    <p className="text-sm text-muted-foreground">
                      Transfer funds to the broker account below. Your account will be credited within{' '}
                      <strong className="text-foreground">1 business day</strong> after confirmation.
                    </p>
                    <div className="bg-background border border-border rounded-lg p-4 space-y-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Transfer To</p>
                      <div className="space-y-2">
                        {[
                          { label: 'Bank', value: BROKER_ACCOUNT.bank },
                          { label: 'Account Name', value: BROKER_ACCOUNT.accountName },
                          { label: 'Sort Code', value: BROKER_ACCOUNT.sortCode },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between items-center">
                            <span className="text-muted-foreground text-sm">{label}</span>
                            <span className="text-foreground text-sm font-medium">{value}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-sm">Account Number</span>
                          <div className="flex items-center gap-2">
                            <span className="text-foreground text-sm font-bold tracking-widest">{BROKER_ACCOUNT.accountNo}</span>
                            <button onClick={copyAccNo} className="text-muted-foreground hover:text-primary transition-colors" title="Copy">
                              {copied ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3 flex gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-yellow-200 text-xs leading-relaxed">
                        Use your <strong>full registered name</strong> as the transfer narration so we can match your payment.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'withdraw' && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Amount to Withdraw <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₦</span>
                        <input
                          type="number" placeholder="0.00" min="1"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="w-full pl-8 pr-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        Withdrawable balance: {summaryLoading ? '…' : fmtKobo(cashKobo)}
                      </p>
                      {withdrawKobo > cashKobo && (
                        <p className="text-red-400 text-xs mt-1">Amount exceeds available balance</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Destination Bank <span className="text-red-400">*</span>
                      </label>
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        <input
                          type="text"
                          placeholder="e.g. Zenith Bank — 0123456789"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none"
                        />
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        Enter the bank name and account number your funds should be sent to.
                      </p>
                    </div>

                    <button
                      onClick={() => withdrawMutation.mutate()}
                      disabled={!withdrawAmount || withdrawNaira <= 0 || withdrawKobo > cashKobo || !bankName.trim() || withdrawMutation.isPending}
                      className="w-full bg-primary disabled:opacity-40 text-primary-foreground font-semibold py-3 px-4 rounded-lg transition-all duration-200 text-sm"
                    >
                      {withdrawMutation.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Processing…
                        </span>
                      ) : 'Request Withdrawal'}
                    </button>
                    <p className="text-muted-foreground text-xs text-center">
                      Withdrawals processed within <strong className="text-foreground">1–3 business days</strong>. Subject to T+2 settlement rules.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
              <h3 className="text-xl font-semibold text-foreground">Bank transfer info</h3>
              <p className="mt-2 text-sm text-muted-foreground">Use your registered name as narration when transferring to the broker account.</p>
              <div className="mt-6 space-y-4">
                {[
                  { label: 'Bank', value: BROKER_ACCOUNT.bank },
                  { label: 'Account Name', value: BROKER_ACCOUNT.accountName },
                  { label: 'Sort Code', value: BROKER_ACCOUNT.sortCode },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-3xl bg-[#111821]/80 border border-[#0ecb81]/10 p-4">
                    <span className="text-xs text-muted-foreground uppercase tracking-[0.22em]">{item.label}</span>
                    <span className="text-sm font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 rounded-3xl bg-[#111821]/80 border border-[#0ecb81]/10 p-4">
                  <span className="text-xs text-muted-foreground uppercase tracking-[0.22em]">Account Number</span>
                  <button onClick={copyAccNo} className="inline-flex items-center gap-2 text-sm font-medium text-[#0ecb81] hover:text-[#0ecb81]/80 transition-all">
                    <span className="font-semibold tracking-widest">{BROKER_ACCOUNT.accountNo}</span>
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 p-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)]">
              <h3 className="text-xl font-semibold text-foreground">Settlement note</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-6">Deposits are credited within one business day after bank confirmation. Withdrawals follow SEC T+2 settlement rules and are processed within 1–3 business days.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#0ecb81]/15 bg-[#0b0e11]/80 mt-6 shadow-[0_30px_60px_-40px_rgba(14,203,129,0.6)] overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Recent Transactions</h3>
          </div>
          {txLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : txs.length === 0 ? (
            <div className="flex flex-col items-center py-10 px-4 text-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">No transactions yet</p>
                <p className="text-xs text-muted-foreground">Deposits, withdrawals and trades will appear here.</p>
              </div>
              <button
                onClick={() => setActiveTab('deposit')}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/20">
                Make a Deposit <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {txs.map((tx: Transaction) => {
                const isCredit = tx.type === 'deposit' || tx.type === 'sell'
                return (
                  <div key={tx.id} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCredit ? 'bg-primary/20' : 'bg-accent/20'}`}>
                      {isCredit
                        ? <ArrowDownToLine className="w-3.5 h-3.5 text-primary" />
                        : <ArrowUpFromLine className="w-3.5 h-3.5 text-accent" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium capitalize">{tx.type}</p>
                      <p className="text-muted-foreground text-xs truncate">{tx.description || tx.reference}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold ${isCredit ? 'text-primary' : 'text-foreground'}`}>
                        {isCredit ? '+' : '-'}{fmtKobo(Math.abs(tx.amountKobo))}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-primary" />
                        <span className="text-[10px] text-muted-foreground capitalize">{tx.type}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
