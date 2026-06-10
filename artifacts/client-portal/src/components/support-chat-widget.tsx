import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, ChevronDown, Bot, UserCircle, Headphones, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supportApi, type SupportMessage, type SupportChat } from '@/lib/api'

function roleBubbleClass(role: string) {
  if (role === 'client') return 'bg-primary text-primary-foreground self-end'
  if (role === 'agent') return 'bg-blue-500/20 text-blue-200 border border-blue-500/30 self-start'
  return 'bg-secondary/30 text-foreground border border-border self-start'
}

function RoleIcon({ role }: { role: string }) {
  if (role === 'agent') return <Headphones className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
  if (role === 'bot') return <Bot className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
  return null
}

function formatContent(text: string) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g)
    return (
      <span key={i}>
        {i > 0 && <br />}
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part,
        )}
      </span>
    )
  })
}

export default function SupportChatWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [chat, setChat] = useState<SupportChat | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [resolved, setResolved] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const adminRoles = ['admin', 'broker', 'compliance']
  if (!user || adminRoles.includes(user.role)) return null

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (open && !chat) {
      loadOrCreateChat()
    }
  }, [open])

  useEffect(() => {
    scrollToBottom()
  }, [messages, thinking])

  async function loadOrCreateChat() {
    setLoading(true)
    try {
      const result = await supportApi.createOrGetChat()
      setChat(result.chat)
      setMessages(result.messages)
      setResolved(result.chat.status === 'resolved')
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage(escalate = false) {
    if ((!input.trim() && !escalate) || !chat || thinking) return
    const content = escalate ? 'I would like to speak with a human agent.' : input.trim()
    setInput('')
    setThinking(true)

    const optimistic: SupportMessage = {
      id: `tmp-${Date.now()}`,
      chatId: chat.id,
      senderId: user.id,
      senderRole: 'client',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const result = await supportApi.sendMessage(chat.id, { content, escalate })
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== optimistic.id)
        const next = [...without, result.message]
        if (result.botReply) next.push(result.botReply)
        return next
      })
      if (result.escalated) {
        setChat((c) => c ? { ...c, status: 'active' } : c)
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
    } finally {
      setThinking(false)
    }
  }

  async function resolveChat() {
    if (!chat) return
    try {
      await supportApi.resolveChat(chat.id)
      setResolved(true)
      setChat((c) => c ? { ...c, status: 'resolved' } : c)
    } catch {
      // ignore
    }
  }

  const isEscalated = chat?.status === 'active'

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-[74px] right-4 md:bottom-6 md:right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center"
        aria-label="Support chat"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {open && (
        <div className="fixed bottom-[138px] right-2 left-2 md:left-auto md:bottom-20 md:right-6 z-50 md:w-[340px] max-h-[72dvh] md:max-h-[520px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-card">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
              {isEscalated
                ? <Headphones className="w-3.5 h-3.5 text-blue-400" />
                : <Bot className="w-3.5 h-3.5 text-primary" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground leading-none">
                {isEscalated ? 'Support Agent' : 'Support Bot'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isEscalated ? 'Agent will respond shortly' : 'AI-powered · usually instant'}
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
            {loading && (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col max-w-[85%] ${m.senderRole === 'client' ? 'self-end items-end ml-auto' : 'self-start items-start'}`}>
                {m.senderRole !== 'client' && (
                  <div className="flex items-center gap-1 mb-0.5 px-1">
                    <RoleIcon role={m.senderRole} />
                    <span className="text-[9px] text-muted-foreground capitalize">{m.senderRole === 'agent' ? 'Agent' : 'Bot'}</span>
                  </div>
                )}
                <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${roleBubbleClass(m.senderRole)}`}>
                  {formatContent(m.content)}
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex items-center gap-1.5 self-start">
                <Bot className="w-3 h-3 text-primary" />
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {resolved && (
              <div className="flex items-center gap-2 justify-center py-2 text-xs text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Chat resolved
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {!resolved && (
            <>
              {!isEscalated && (
                <div className="px-3 pt-1 pb-1">
                  <button
                    onClick={() => sendMessage(true)}
                    disabled={thinking}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary/20 transition-all disabled:opacity-50"
                  >
                    <Headphones className="w-3 h-3" />
                    Talk to an Agent
                  </button>
                </div>
              )}

              <div className="px-3 pb-3 pt-1 flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type a message…"
                  disabled={thinking}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || thinking}
                  className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {isEscalated && (
                <div className="px-3 pb-3">
                  <button
                    onClick={resolveChat}
                    className="w-full text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Mark as resolved
                  </button>
                </div>
              )}
            </>
          )}

          {resolved && (
            <div className="px-3 pb-3">
              <button
                onClick={() => { setChat(null); setMessages([]); setResolved(false); loadOrCreateChat() }}
                className="w-full py-2 rounded-xl border border-border text-xs text-muted-foreground hover:bg-secondary/20 transition-all"
              >
                Start new chat
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
