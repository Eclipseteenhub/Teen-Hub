import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { GetServerSideProps } from 'next'
import { requireAuth } from '@/lib/middleware'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy:   'text-green-400 border-green-500/30 bg-green-900/10',
  Medium: 'text-yellow-400 border-yellow-500/30 bg-yellow-900/10',
  Hard:   'text-orange-400 border-orange-500/30 bg-orange-900/10',
  Expert: 'text-red-400 border-red-500/30 bg-red-900/10',
}

// Listing-level (Quest.status)
const QUEST_STATUS_COLOR: Record<string, string> = {
  OPEN:   'text-green-400',
  FULL:   'text-yellow-400',
  CLOSED: 'text-slate-500',
}

// Personal progress (QuestClaim.status) — takes priority when the member has a claim
const CLAIM_STATUS_COLOR: Record<string, string> = {
  CLAIMED:     'text-yellow-400',
  IN_PROGRESS: 'text-blue-400',
  SUBMITTED:   'text-purple-400',
  APPROVED:    'text-green-300',
  REJECTED:    'text-red-400',
}

export default function QuestsPage() {
  const { data: session } = useSession()
  const [quests, setQuests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/quests')
      .then(r => r.json())
      .then(data => { setQuests(data.quests || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? quests
    : filter === 'mine' ? quests.filter(q => !!q.myClaim)
    : quests.filter(q => q.status === filter.toUpperCase())

  return (
    <>
      <Head><title>Quest Board — QuestHub Guild</title></Head>
      <DashboardLayout>
        <div className="max-w-5xl mx-auto flex flex-col gap-6">

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-orbitron font-black text-xl text-white tracking-widest uppercase">Quest Board</h1>
              <p className="font-rajdhani text-slate-500 text-sm mt-1">Active missions available to your rank</p>
            </div>
            <div className="flex items-center gap-1.5">
              {['all', 'mine', 'open', 'full'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`font-orbitron text-[10px] tracking-widest uppercase px-3 py-1.5 border transition-all ${
                    filter === f
                      ? 'border-purple-500/60 bg-purple-900/30 text-purple-300'
                      : 'border-slate-700 text-slate-600 hover:border-purple-500/30 hover:text-slate-400'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                <p className="font-orbitron text-xs text-purple-400 tracking-widest animate-pulse">SCANNING QUEST BOARD...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-[#0d0017] border border-purple-500/20 p-12 text-center">
              <div className="font-orbitron text-5xl text-slate-800 mb-4">◆</div>
              <p className="font-orbitron text-sm text-slate-600 tracking-widest mb-2">No Quests Available</p>
              <p className="font-rajdhani text-slate-700 text-sm">The Founder posts new quests regularly. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((quest: any) => {
                const displayStatus = quest.myClaim?.status || quest.status
                const statusColor = quest.myClaim ? CLAIM_STATUS_COLOR[displayStatus] : QUEST_STATUS_COLOR[displayStatus]
                return (
                  <Link href={`/dashboard/quest/${quest.id}`} key={quest.id}>
                    <div className="relative bg-[#0d0017] border border-purple-500/20 p-5 hover:border-purple-400/50 hover:shadow-[0_0_25px_rgba(168,85,247,0.08)] transition-all duration-300 group cursor-pointer h-full">
                      <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-purple-500/40 group-hover:border-purple-400 transition-colors" />
                      <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-purple-500/40 group-hover:border-purple-400 transition-colors" />

                      {quest.aiRecommended && (
                        <div className="absolute -top-2.5 left-4 font-orbitron text-[8px] tracking-widest uppercase bg-amber-500 text-black px-2 py-0.5 flex items-center gap-1">
                          <span>✦</span> AI MATCH
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-orbitron font-bold text-sm text-white leading-snug">{quest.title}</h3>
                        <span className={`font-orbitron text-[9px] tracking-widest flex-shrink-0 ${statusColor || 'text-slate-500'}`}>
                          {displayStatus.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className="font-orbitron text-[9px] border border-purple-500/30 bg-purple-900/20 text-purple-400 px-2 py-0.5 tracking-widest">
                          {quest.category}
                        </span>
                        {quest.difficulty && (
                          <span className={`font-orbitron text-[9px] border px-2 py-0.5 tracking-widest ${DIFFICULTY_COLOR[quest.difficulty] || 'text-slate-400 border-slate-700'}`}>
                            {quest.difficulty}
                          </span>
                        )}
                        <span className="font-orbitron text-[9px] border border-slate-700 text-slate-500 px-2 py-0.5 tracking-widest">
                          Rank {quest.rankRequired}+
                        </span>
                        {quest.slotsTotal > 1 && (
                          <span className="font-orbitron text-[9px] border border-blue-500/30 text-blue-400 px-2 py-0.5 tracking-widest">
                            {quest.slotsFilled}/{quest.slotsTotal} SLOTS
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <div className="font-orbitron text-[8px] text-slate-700 tracking-widest uppercase">XP Reward</div>
                          <div className="font-orbitron text-purple-400 font-bold mt-0.5">+{quest.rewardXp} XP</div>
                        </div>
                        {quest.deadline && (
                          <div>
                            <div className="font-orbitron text-[8px] text-slate-700 tracking-widest uppercase">Deadline</div>
                            <div className="font-rajdhani text-slate-400 mt-0.5">
                              {new Date(quest.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-purple-500/10 flex items-center justify-between">
                        <span className="font-rajdhani text-xs text-slate-600">View Details →</span>
                        {quest.status === 'OPEN' && !quest.myClaim && (
                          <span className="font-orbitron text-[9px] text-green-400 border border-green-500/30 px-2 py-0.5 tracking-widest">
                            AVAILABLE
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const redirect = await requireAuth(context, 'ACCEPTED_MEMBER')
  if (redirect) return redirect
  return { props: {} }
}