import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import StatCard from '@/components/dashboard/StatCard'
import RankBadge from '@/components/ui/RankBadge'
import XPBar from '@/components/ui/XPBar'
import StatusChip from '@/components/ui/StatusChip'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login')
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetch('/api/user/me')
        .then(r => r.json())
        .then(data => { setUserData(data); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [session])

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
            <p className="font-orbitron text-xs text-purple-400 tracking-widest animate-pulse">
              LOADING OPERATIVE DATA...
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session) return null

  const user = userData || session.user
  const rank = user.rank || 'F'
  const xp = user.xp || 0
  const activeQuests = userData?.questClaims?.length || 0
  const warnings = userData?.warnings?.length || 0
  const recentActivity = userData?.activityLogs || []
  const recentXP = userData?.xpLogs || []
  const trialStatus = userData?.trial?.status

  return (
    <>
      <Head><title>Command Center — QuestHub Guild</title></Head>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto flex flex-col gap-6">

          {/* ── Welcome header ── */}
          <div className="relative bg-[#0d0017] border border-purple-500/20 p-5 sm:p-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/10 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-2xl pointer-events-none" />
            <span className="absolute top-0 left-0 w-4 h-4 border-t border-l border-purple-500/50" />
            <span className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-purple-500/50" />

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <RankBadge rank={rank} size="lg" showLabel />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-orbitron text-[10px] text-purple-400/70 tracking-[0.3em] uppercase">
                    Operative
                  </span>
                  {trialStatus && <StatusChip status={trialStatus} size="sm" />}
                </div>
                <h1 className="font-orbitron font-black text-xl sm:text-2xl text-white mb-3">
                  {user.nickname || user.name}
                </h1>
                <XPBar xp={xp} rank={rank} showNumbers />
              </div>
            </div>
          </div>

          {/* ── Trial status banner ── */}
          {trialStatus === 'PENDING' && (
            <div className="bg-yellow-900/15 border border-yellow-500/30 p-4 flex items-start gap-3">
              <span className="text-yellow-400 mt-0.5 text-lg flex-shrink-0">⚠</span>
              <div>
                <p className="font-orbitron text-xs text-yellow-400 tracking-widest uppercase mb-1">
                  Trial Pending Review
                </p>
                <p className="font-rajdhani text-slate-400 text-sm">
                  Your application is with the Guild Council. You'll be notified once reviewed. Full access unlocks after acceptance.
                </p>
              </div>
            </div>
          )}

          {trialStatus === 'UNDER_REVIEW' && (
            <div className="bg-blue-900/15 border border-blue-500/30 p-4 flex items-start gap-3">
              <span className="text-blue-400 mt-0.5 text-lg flex-shrink-0">◉</span>
              <div>
                <p className="font-orbitron text-xs text-blue-400 tracking-widest uppercase mb-1">
                  Under Active Review
                </p>
                <p className="font-rajdhani text-slate-400 text-sm">
                  A Trial Judge is reviewing your application now. Stay active and check back soon.
                </p>
              </div>
            </div>
          )}

          {trialStatus === 'REJECTED' && (
            <div className="bg-red-900/15 border border-red-500/30 p-4 flex items-start gap-3">
              <span className="text-red-400 mt-0.5 text-lg flex-shrink-0">✕</span>
              <div>
                <p className="font-orbitron text-xs text-red-400 tracking-widest uppercase mb-1">
                  Application Rejected
                </p>
                <p className="font-rajdhani text-slate-400 text-sm">
                  Your trial application was not accepted at this time. Contact an admin for feedback.
                </p>
              </div>
            </div>
          )}

          {/* ── Stats grid ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Total XP" value={xp} icon="⚡" color="purple" sub="Lifetime earned" />
            <StatCard label="Current Rank" value={rank} icon="◈" color="amber" sub={`Guild tier ${['F','E','D','C','B','A','S','SS','SSS'].indexOf(rank) + 1} of 9`} />
            <StatCard label="Active Quests" value={activeQuests} icon="◆" color="blue" sub="Claimed / in progress" />
            <StatCard label="Warnings" value={warnings} icon="⚠" color={warnings > 0 ? 'red' : 'green'} sub={warnings === 0 ? 'Clean record' : 'Review rules'} />
          </div>

          {/* ── Main grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

            {/* Activity feed */}
            <div className="lg:col-span-2 bg-[#0d0017] border border-purple-500/20 p-5">
              <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-purple-500/30" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-orbitron font-bold text-sm text-white tracking-widest uppercase">
                  Recent Activity
                </h2>
                <span className="font-rajdhani text-xs text-slate-600 tracking-widest uppercase">
                  Last 20 actions
                </span>
              </div>

              {recentActivity.length === 0 ? (
                <div className="text-center py-10">
                  <p className="font-rajdhani text-slate-600 text-sm">No activity yet. Complete your trial or claim a quest to get started.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recentActivity.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-purple-500/10 last:border-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500/60 mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-rajdhani text-sm text-slate-300">{log.details || log.action}</p>
                        <p className="font-rajdhani text-xs text-slate-600 mt-0.5">
                          {new Date(log.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className="font-orbitron text-[9px] text-purple-500/60 tracking-widest flex-shrink-0">
                        {log.action}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* XP log + quick links */}
            <div className="flex flex-col gap-4">

              {/* XP log */}
              <div className="bg-[#0d0017] border border-purple-500/20 p-5">
                <h2 className="font-orbitron font-bold text-sm text-white tracking-widest uppercase mb-4">
                  XP Log
                </h2>
                {recentXP.length === 0 ? (
                  <p className="font-rajdhani text-slate-600 text-sm">No XP earned yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recentXP.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between py-2 border-b border-purple-500/10 last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="font-rajdhani text-xs text-slate-400 truncate">{log.reason}</p>
                          <p className="font-rajdhani text-[11px] text-slate-600">
                            {new Date(log.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <span className={`font-orbitron font-bold text-sm flex-shrink-0 ml-3 ${log.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {log.amount > 0 ? '+' : ''}{log.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick links */}
              <div className="bg-[#0d0017] border border-purple-500/20 p-5">
                <h2 className="font-orbitron font-bold text-sm text-white tracking-widest uppercase mb-4">
                  Quick Access
                </h2>
                <div className="flex flex-col gap-2">
                  {[
                    { href: '/dashboard/quests',   icon: '◈', label: 'Browse Quests'   },
                    { href: '/dashboard/profile',  icon: '◉', label: 'Edit Profile'    },
                    { href: '/dashboard/messages', icon: '◎', label: 'Messages'        },
                    { href: '/dashboard/chat',     icon: '⬢', label: 'Guild Chat'      },
                    { href: '/dashboard/arena',    icon: '◆', label: 'Fun Arena'       },
                  ].map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2.5 border border-purple-500/15 text-slate-400 hover:border-purple-400/40 hover:text-purple-300 hover:bg-purple-900/10 transition-all duration-200"
                    >
                      <span className="text-purple-500/60">{item.icon}</span>
                      <span className="font-rajdhani font-semibold text-sm">{item.label}</span>
                      <span className="ml-auto text-slate-700 text-xs">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}