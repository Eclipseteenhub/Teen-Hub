import { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import { requireAuth, hasMinRole } from '@/lib/middleware'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

const RANK_LEVEL: Record<string, number> = { F:0,E:1,D:2,C:3,B:4,A:5,S:6,SS:7,SSS:8 }

export default function MessagesPage({ locked, lockReason }: { locked: boolean; lockReason?: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [conversations, setConversations] = useState<any[]>([])
  const [activeConv, setActiveConv] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (locked) return
    fetch('/api/messages')
      .then(r => r.json())
      .then(data => { setConversations(data.conversations || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [locked])

  // Deep link support: /dashboard/messages?with=<userId>&name=<name> opens
  // (or starts) that thread directly — used by quest-suggestion notifications
  // so a member/Founder lands straight in the right conversation.
  useEffect(() => {
    if (locked || !router.isReady) return
    const withId = router.query.with as string | undefined
    if (!withId) return
    const name = (router.query.name as string) || 'Member'
    openConv({ userId: withId, name })
  }, [locked, router.isReady, router.query.with])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function openConv(conv: any) {
    setActiveConv(conv)
    const res = await fetch(`/api/messages/${conv.userId}`)
    const data = await res.json()
    setMessages(data.messages || [])
  }

  async function send() {
    if (!text.trim() || !activeConv) return
    const res = await fetch(`/api/messages/${activeConv.userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    })
    const data = await res.json()
    if (res.ok) {
      setMessages(prev => [...prev, data.message])
      setText('')
    }
  }

  if (locked) {
    return (
      <>
        <Head><title>Messages — QuestHub Guild</title></Head>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="relative bg-[#0d0017] border border-purple-500/20 p-10 max-w-md w-full text-center">
              <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-purple-500/40" />
              <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-purple-500/40" />
              <div className="text-4xl mb-4 text-slate-700">🔒</div>
              <h2 className="font-orbitron font-black text-lg text-white mb-3 tracking-widest">ACCESS LOCKED</h2>
              <p className="font-rajdhani text-slate-400 leading-relaxed">{lockReason || 'Messages unlock at Rank D.'}</p>
              <div className="mt-6 bg-black/40 border border-purple-500/20 px-4 py-3">
                <p className="font-orbitron text-[10px] text-purple-400 tracking-widest">REQUIREMENT: RANK D+</p>
              </div>
            </div>
          </div>
        </DashboardLayout>
      </>
    )
  }

  return (
    <>
      <Head><title>Messages — QuestHub Guild</title></Head>
      <DashboardLayout>
        <div className="max-w-5xl mx-auto">
          <h1 className="font-orbitron font-black text-lg text-white tracking-widest uppercase mb-5">Messages</h1>

          <div className="flex border border-purple-500/20 bg-[#0d0017] overflow-hidden" style={{ height: '70vh' }}>
            {/* Sidebar */}
            <div className="w-64 border-r border-purple-500/15 flex flex-col flex-shrink-0">
              <div className="px-4 py-3 border-b border-purple-500/15">
                <span className="font-orbitron text-[10px] text-slate-600 tracking-widest uppercase">Conversations</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="w-6 h-6 border border-purple-500/40 border-t-purple-400 rounded-full animate-spin" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="font-rajdhani text-slate-600 text-sm">No messages yet.</p>
                  </div>
                ) : (
                  conversations.map((conv: any) => (
                    <button
                      key={conv.userId}
                      onClick={() => openConv(conv)}
                      className={`w-full px-4 py-3 text-left border-b border-purple-500/10 transition-colors hover:bg-purple-900/10 ${
                        activeConv?.userId === conv.userId ? 'bg-purple-900/20' : ''
                      }`}
                    >
                      <div className="font-orbitron text-xs text-white truncate">{conv.name}</div>
                      <div className="font-rajdhani text-xs text-slate-500 truncate mt-0.5">{conv.lastMessage}</div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col">
              {!activeConv ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="font-rajdhani text-slate-700 text-sm">Select a conversation</p>
                </div>
              ) : (
                <>
                  <div className="px-5 py-3 border-b border-purple-500/15 flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="font-orbitron text-xs text-white tracking-wide">{activeConv.name}</span>
                    <span className="font-rajdhani text-[10px] text-slate-600 ml-auto">AI-moderated channel</span>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                    {messages.map((msg: any) => {
                      const mine = msg.fromId === session?.user?.id
                      return (
                        <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs px-4 py-2.5 text-sm font-rajdhani leading-relaxed ${
                            mine
                              ? 'bg-purple-900/40 border border-purple-500/30 text-purple-100'
                              : 'bg-slate-900/60 border border-slate-700/50 text-slate-300'
                          }`}>
                            {msg.content}
                            <div className={`text-[10px] mt-1 ${mine ? 'text-purple-400/50' : 'text-slate-600'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={endRef} />
                  </div>

                  <div className="px-4 py-3 border-t border-purple-500/15 flex items-center gap-3">
                    <input
                      value={text}
                      onChange={e => setText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && send()}
                      placeholder="Type a message…"
                      className="flex-1 bg-black/40 border border-purple-500/20 text-slate-200 text-sm font-rajdhani px-4 py-2.5 focus:outline-none focus:border-purple-400/50 transition-colors"
                    />
                    <button
                      onClick={send}
                      className="bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:bg-purple-600/50 transition-colors px-4 py-2.5 font-orbitron text-xs tracking-widest"
                    >
                      SEND
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="font-rajdhani text-[11px] text-slate-700 mt-2">
            ⚠ All messages are AI-monitored. Contact information sharing is automatically blocked.
          </p>
        </div>
      </DashboardLayout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const redirectResult = await requireAuth(context, 'ACCEPTED_MEMBER')
  if (redirectResult) return redirectResult

  const session = await getServerSession(context.req, context.res, authOptions)
  const rank = (session?.user?.rank ?? 'F') as string
  if (RANK_LEVEL[rank] < RANK_LEVEL['D']) {
    return {
      props: {
        locked: true,
        lockReason: `Messages unlock at Rank D. Your current rank is ${rank}. Keep completing quests to advance.`,
      },
    }
  }

  return { props: { locked: false } }
}