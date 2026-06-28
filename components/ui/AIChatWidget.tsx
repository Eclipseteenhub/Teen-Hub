'use client'
import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  questDraft?: Record<string, unknown> | null
  debug?: string
  suggestionSent?: boolean
}

const SUGGESTIONS = [
  'How do I rank up?',
  'What is the trust score?',
  'How do I claim a quest?',
  'What happens after I apply?',
]

export default function AIChatWidget() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `SENTINEL online. I'm your QuestHub AI assistant — ask me about quests, ranks, trust scores, or how the platform works.`,
      }])
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: messages.slice(-6),
        }),
      })
      const data = await res.json()
      setMessages([...newMessages, {
        role: 'assistant',
        content: data.reply || 'No response.',
        questDraft: data.questDraft || null,
        debug: data.debug,
      }])
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'SENTINEL offline. Try again.', debug: 'Client-side fetch failed — check network tab for a CORS, DNS, or connectivity error.' }])
    } finally {
      setLoading(false)
    }
  }

  async function createQuestFromDraft(draft: Record<string, unknown>) {
    if (!session || session.user.role !== 'FOUNDER') return
    setCreating(true)
    try {
      const res = await fetch('/api/founder/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `✗ Failed to create quest.`, debug: data.error || `Server returned ${res.status}` },
        ])
        return
      }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '✓ Quest created and posted to the Quest Board.' },
      ])
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: '✗ Failed to create quest.', debug: err?.message || 'Network request failed' }])
    } finally {
      setCreating(false)
    }
  }

  async function suggestQuestFromDraft(draft: Record<string, unknown>) {
    setSuggesting(true)
    try {
      const res = await fetch('/api/quests/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '✗ Failed to send suggestion.', debug: data.error || `Server returned ${res.status}` },
        ])
        return
      }
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '✓ Sent to the Founder for review. A chat thread has been opened so you can discuss terms — check your notifications or Messages.',
          suggestionSent: true,
        },
      ])
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: '✗ Failed to send suggestion.', debug: err?.message || 'Network request failed' }])
    } finally {
      setSuggesting(false)
    }
  }

  const isFounder = session?.user?.role === 'FOUNDER'
  const ROLE_LEVEL: Record<string, number> = {
    GUEST: 0, TRIAL_MEMBER: 1, ACCEPTED_MEMBER: 2, ACTIVE_WORKER: 3,
    MODERATOR: 4, COORDINATOR: 5, ADMIN: 6, FOUNDER: 7,
  }
  const canSuggest = !isFounder && ROLE_LEVEL[session?.user?.role || 'GUEST'] >= ROLE_LEVEL['ACCEPTED_MEMBER']

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 sm:w-14 sm:h-14 bg-purple-700 border border-purple-400/50 shadow-[0_0_25px_rgba(168,85,247,0.5)] flex items-center justify-center hover:bg-purple-600 transition-all duration-200 hover:scale-105 animate-pulse-glow"
        title="SENTINEL AI"
      >
        <span className="font-orbitron font-black text-white text-xs sm:text-sm">AI</span>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 sm:right-5 z-50 w-[calc(100vw-2rem)] max-w-sm sm:max-w-md flex flex-col bg-deep-black border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.15)] overflow-hidden"
          style={{ height: 'min(520px, calc(100vh - 100px))' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/20 bg-black/60 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-orbitron font-bold text-xs text-white tracking-wider">SENTINEL AI</span>
              {isFounder && (
                <span className="font-orbitron text-[8px] text-purple-400 tracking-widest border border-purple-500/30 px-1.5 py-0.5">FOUNDER</span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-white transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${
                  m.role === 'user'
                    ? 'bg-purple-700/30 border border-purple-500/30 text-slate-200'
                    : 'bg-black/60 border border-purple-500/15 text-slate-300'
                } px-3 py-2`}>
                  {m.role === 'assistant' && (
                    <div className="font-orbitron text-[8px] text-purple-400/60 mb-1 tracking-widest">SENTINEL</div>
                  )}
                  <p className="font-rajdhani text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>

                  {/* Founder-only raw error detail — never shown to regular members */}
                  {m.debug && isFounder && (
                    <div className="mt-1.5 pt-1.5 border-t border-red-500/20">
                      <div className="font-orbitron text-[8px] text-red-400/80 tracking-widest mb-0.5">DEBUG (FOUNDER ONLY)</div>
                      <p className="font-mono text-[10px] text-red-300/90 leading-snug break-all">{m.debug}</p>
                    </div>
                  )}

                  {/* Quest draft creation button — Founder only */}
                  {m.questDraft && isFounder && (
                    <div className="mt-2 pt-2 border-t border-purple-500/20">
                      <div className="font-orbitron text-[8px] text-purple-400 mb-1.5 tracking-widest">QUEST DRAFT READY</div>
                      <div className="font-rajdhani text-xs text-slate-400 mb-2">
                        <strong className="text-white">{String(m.questDraft.title)}</strong> · {String(m.questDraft.category)} · {String(m.questDraft.difficulty)}
                      </div>
                      <button
                        onClick={() => createQuestFromDraft(m.questDraft as Record<string, unknown>)}
                        disabled={creating}
                        className="font-orbitron text-[9px] bg-purple-700/50 hover:bg-purple-600/60 border border-purple-500/40 text-white px-3 py-1.5 transition-all disabled:opacity-50"
                      >
                        {creating ? 'CREATING...' : '+ CREATE QUEST'}
                      </button>
                    </div>
                  )}

                  {/* Quest draft suggestion button — everyone else who's an accepted member */}
                  {m.questDraft && canSuggest && !m.suggestionSent && (
                    <div className="mt-2 pt-2 border-t border-purple-500/20">
                      <div className="font-orbitron text-[8px] text-purple-400 mb-1.5 tracking-widest">QUEST IDEA READY</div>
                      <div className="font-rajdhani text-xs text-slate-400 mb-2">
                        <strong className="text-white">{String(m.questDraft.title)}</strong> · {String(m.questDraft.category)} · {String(m.questDraft.difficulty)}
                      </div>
                      <button
                        onClick={() => suggestQuestFromDraft(m.questDraft as Record<string, unknown>)}
                        disabled={suggesting}
                        className="font-orbitron text-[9px] bg-amber-700/40 hover:bg-amber-600/50 border border-amber-500/40 text-amber-200 px-3 py-1.5 transition-all disabled:opacity-50"
                      >
                        {suggesting ? 'SENDING...' : '→ SUGGEST TO FOUNDER'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-black/60 border border-purple-500/15 px-3 py-2">
                  <div className="font-orbitron text-[8px] text-purple-400/60 mb-1">SENTINEL</div>
                  <div className="flex gap-1 items-center py-1">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (only when first message) */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="font-rajdhani text-[10px] text-purple-400 border border-purple-500/25 bg-purple-950/30 px-2 py-1 hover:border-purple-400/50 hover:text-purple-300 transition-all"
                >
                  {s}
                </button>
              ))}
              {isFounder && (
                <button
                  onClick={() => send('Create a social media quest for posting 3 reels, rank E, 150 XP reward')}
                  className="font-rajdhani text-[10px] text-amber-400 border border-amber-500/25 bg-amber-950/30 px-2 py-1 hover:border-amber-400/50 transition-all"
                >
                  Create a quest
                </button>
              )}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-purple-500/20 p-3 flex-shrink-0 bg-black/40">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Ask SENTINEL..."
                rows={1}
                className="flex-1 bg-black/60 border border-purple-500/20 text-white placeholder-slate-600 font-rajdhani text-sm px-3 py-2 resize-none focus:outline-none focus:border-purple-500/50 transition-colors"
                style={{ minHeight: '36px', maxHeight: '80px' }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="bg-purple-700/60 border border-purple-500/40 hover:bg-purple-600/70 text-white px-3 py-2 transition-all disabled:opacity-40 flex-shrink-0"
              >
                <span className="font-orbitron text-xs">▶</span>
              </button>
            </div>
            <p className="font-rajdhani text-[9px] text-slate-700 mt-1.5 text-center">Enter to send · Shift+Enter for newline</p>
          </div>
        </div>
      )}
    </>
  )
}