import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Bot, Headphones, CheckCircle2, Clock, UserCircle, Send, RefreshCw } from 'lucide-react'
import AdminLayout from '@/components/admin-layout'
import { supportApi, type SupportChat, type SupportMessage } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

function statusBadge(status: string) {
  const map: Record<string, string> = {
    open:     'bg-amber-500/15 text-amber-400 border-amber-500/30',
    active:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
    resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    closed:   'bg-secondary/20 text-muted-foreground border-border',
  }
  return map[status] ?? map.closed
}

function statusIcon(status: string) {
  if (status === 'open')     return <Clock className="w-3 h-3" />
  if (status === 'active')   return <Headphones className="w-3 h-3" />
  if (status === 'resolved') return <CheckCircle2 className="w-3 h-3" />
  return null
}

function roleBubbleClass(role: string) {
  if (role === 'client') return 'bg-secondary/30 border border-border self-start'
  if (role === 'agent')  return 'bg-primary text-primary-foreground self-end'
  return 'bg-card border border-border/50 self-start'
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

export default function AdminSupport() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [replyInput, setReplyInput] = useState('')
  const [sending, setSending] = useState(false)

  const { data: chatsData, isLoading: chatsLoading } = useQuery({
    queryKey: ['admin-support-chats'],
    queryFn: () => supportApi.adminListChats(),
    refetchInterval: 4_000,
  })

  const { data: threadData, isLoading: threadLoading } = useQuery({
    queryKey: ['admin-support-thread', selectedChatId],
    queryFn: () => supportApi.getMessages(selectedChatId!),
    enabled: !!selectedChatId,
    refetchInterval: 4_000,
  })

  const claimMut = useMutation({
    mutationFn: (chatId: string) => supportApi.claimChat(chatId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-support-chats'] })
      qc.invalidateQueries({ queryKey: ['admin-support-thread', selectedChatId] })
    },
  })

  const resolveMut = useMutation({
    mutationFn: (chatId: string) => supportApi.resolveChat(chatId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-support-chats'] })
      qc.invalidateQueries({ queryKey: ['admin-support-thread', selectedChatId] })
    },
  })

  async function sendReply() {
    if (!replyInput.trim() || !selectedChatId || sending) return
    setSending(true)
    try {
      await supportApi.sendMessage(selectedChatId, { content: replyInput.trim() })
      setReplyInput('')
      qc.invalidateQueries({ queryKey: ['admin-support-thread', selectedChatId] })
      qc.invalidateQueries({ queryKey: ['admin-support-chats'] })
    } finally {
      setSending(false)
    }
  }

  const chats: (SupportChat & { clientName?: string; clientEmail?: string; lastMessage?: SupportMessage })[] =
    (chatsData as any)?.chats ?? []

  const openChats     = chats.filter((c) => c.status === 'open')
  const activeChats   = chats.filter((c) => c.status === 'active')
  const resolvedChats = chats.filter((c) => c.status === 'resolved')

  const selectedChat = chats.find((c) => c.id === selectedChatId)
  const messages: SupportMessage[] = (threadData as any)?.messages ?? []

  return (
    <AdminLayout
      title="Support Inbox"
      subtitle="Customer chat sessions — AI-assisted with human escalation"
      actions={
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['admin-support-chats'] })}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      }
    >
      <div className="flex gap-4 h-[calc(100vh-120px)]">
        {/* Chat list */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
          {chatsLoading && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!chatsLoading && chats.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageCircle className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No chats yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Client support sessions will appear here</p>
            </div>
          )}

          {activeChats.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase px-1 mb-1.5">Needs Agent · {activeChats.length}</p>
              {activeChats.map((c) => <ChatRow key={c.id} chat={c} selected={selectedChatId === c.id} onSelect={setSelectedChatId} />)}
            </div>
          )}

          {openChats.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase px-1 mb-1.5">Bot Handling · {openChats.length}</p>
              {openChats.map((c) => <ChatRow key={c.id} chat={c} selected={selectedChatId === c.id} onSelect={setSelectedChatId} />)}
            </div>
          )}

          {resolvedChats.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase px-1 mb-1.5">Resolved · {resolvedChats.length}</p>
              {resolvedChats.map((c) => <ChatRow key={c.id} chat={c} selected={selectedChatId === c.id} onSelect={setSelectedChatId} />)}
            </div>
          )}
        </div>

        {/* Thread view */}
        <div className="flex-1 bg-card border border-border rounded-xl flex flex-col overflow-hidden">
          {!selectedChatId && (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <MessageCircle className="w-10 h-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Select a chat to view messages</p>
            </div>
          )}

          {selectedChatId && (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <UserCircle className="w-6 h-6 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {selectedChat?.clientName ?? 'Client'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{selectedChat?.clientEmail ?? ''}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(selectedChat?.status ?? 'open')}`}>
                  {statusIcon(selectedChat?.status ?? 'open')}
                  {selectedChat?.status?.toUpperCase()}
                </div>
                <div className="flex gap-2">
                  {selectedChat?.status !== 'resolved' && !selectedChat?.agentId && (
                    <button
                      onClick={() => claimMut.mutate(selectedChatId)}
                      disabled={claimMut.isPending}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all disabled:opacity-50"
                    >
                      Claim Chat
                    </button>
                  )}
                  {selectedChat?.status !== 'resolved' && (
                    <button
                      onClick={() => resolveMut.mutate(selectedChatId)}
                      disabled={resolveMut.isPending}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {threadLoading && (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex flex-col max-w-[80%] ${m.senderRole === 'agent' ? 'self-end items-end ml-auto' : 'self-start items-start'}`}>
                    {m.senderRole !== 'agent' && (
                      <div className="flex items-center gap-1 mb-0.5 px-1">
                        {m.senderRole === 'bot'
                          ? <Bot className="w-3 h-3 text-primary" />
                          : <UserCircle className="w-3 h-3 text-muted-foreground" />
                        }
                        <span className="text-[9px] text-muted-foreground capitalize">
                          {m.senderRole === 'bot' ? 'Bot' : (selectedChat?.clientName ?? 'Client')}
                        </span>
                      </div>
                    )}
                    <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${roleBubbleClass(m.senderRole)}`}>
                      {formatContent(m.content)}
                    </div>
                    <p className="text-[9px] text-muted-foreground/50 mt-0.5 px-1">
                      {new Date(m.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>

              {selectedChat?.status !== 'resolved' && (
                <div className="px-4 py-3 border-t border-border flex gap-2">
                  <input
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendReply()}
                    placeholder={selectedChat?.agentId ? 'Reply as agent…' : 'Claim chat first to reply…'}
                    disabled={sending || !selectedChat?.agentId}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                  <button
                    onClick={sendReply}
                    disabled={!replyInput.trim() || sending || !selectedChat?.agentId}
                    className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

function ChatRow({
  chat,
  selected,
  onSelect,
}: {
  chat: SupportChat & { clientName?: string; clientEmail?: string; lastMessage?: SupportMessage }
  selected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
      onClick={() => onSelect(chat.id)}
      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${
        selected
          ? 'border-primary/40 bg-primary/5'
          : 'border-border hover:bg-secondary/10 bg-card'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <UserCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-xs font-semibold text-foreground truncate flex-1">
          {chat.clientName ?? 'Client'}
        </span>
        <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${statusBadge(chat.status)}`}>
          {chat.status === 'active' && <Headphones className="w-2.5 h-2.5" />}
          {chat.status === 'open' && <Bot className="w-2.5 h-2.5" />}
          {chat.status.toUpperCase()}
        </span>
      </div>
      {chat.lastMessage && (
        <p className="text-[10px] text-muted-foreground truncate pl-5">
          {chat.lastMessage.content}
        </p>
      )}
      <p className="text-[9px] text-muted-foreground/50 pl-5 mt-0.5">
        {new Date(chat.updatedAt).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}
      </p>
    </button>
  )
}
