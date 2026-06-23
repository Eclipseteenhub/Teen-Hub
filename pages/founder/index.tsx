import { useState, useEffect } from 'react'
import Head from 'next/head'
import { GetServerSideProps } from 'next'
import { requireAuth } from '@/lib/middleware'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import RankBadge from '@/components/ui/RankBadge'
import StatusChip from '@/components/ui/StatusChip'
import { GlowInput, GlowTextarea } from '@/components/ui/GlowInput'
import GlowButton from '@/components/ui/GlowButton'

const TAB_GROUPS = [
  { label: 'Command', tabs: ['Overview'] },
  { label: 'People', tabs: ['Users', 'Trials', 'Admins'] },
  { label: 'Content', tabs: ['Quests', 'Arena', 'Posts', 'Achievements', 'Titles'] },
  { label: 'Trust & Safety', tabs: ['Trust', 'AI Alerts', 'Feedback'] },
  { label: 'Operations', tabs: ['Feature Unlock', 'Payouts', 'Settings'] },
]
const ALL_TABS = TAB_GROUPS.flatMap(g => g.tabs)

const RANK_COLORS: Record<string, string> = {
  F:'text-slate-400',E:'text-green-400',D:'text-blue-400',C:'text-yellow-400',
  B:'text-orange-400',A:'text-purple-400',S:'text-pink-400',SS:'text-red-400',SSS:'text-amber-300',
}

export default function FounderDashboard() {
  const [tab, setTab] = useState('Overview')
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [quests, setQuests] = useState<any[]>([])
  const [trials, setTrials] = useState<any[]>([])
  const [trialTasks, setTrialTasks] = useState<any[]>([])
  const [admins, setAdmins] = useState<any[]>([])
  const [arena, setArena] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])
  const [titles, setTitles] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [unlocks, setUnlocks] = useState<any[]>([])
  const [features, setFeatures] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any>({ flaggedChat: [], flaggedDMs: [], unresolvedReports: [], recentWarnings: [], riskyUsers: [] })
  const [payouts, setPayouts] = useState<any>({ quests: [], totalPending: 0, totalPaid: 0, pendingCount: 0, paidCount: 0 })
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')
  const [aiEvalId, setAiEvalId] = useState('')
  const [aiEvalResult, setAiEvalResult] = useState<any>(null)
  const [aiEvalLoading, setAiEvalLoading] = useState(false)

  // Trial task assignment
  const [assignUserId, setAssignUserId] = useState('')
  const [assignTaskId, setAssignTaskId] = useState('')

  // Feature unlock
  const [unlockUserId, setUnlockUserId] = useState('')
  const [unlockFeature, setUnlockFeature] = useState('')
  const [unlockNote, setUnlockNote] = useState('')

  // Feedback reply
  const [replyFbId, setReplyFbId] = useState('')
  const [replyContent, setReplyContent] = useState('')

  // Trust award
  const [trustUserId, setTrustUserId] = useState('')
  const [trustAction, setTrustAction] = useState('QUEST_COMPLETED')
  const [trustReason, setTrustReason] = useState('')

  // Award forms
  const [awardAchId, setAwardAchId] = useState('')
  const [awardAchUserId, setAwardAchUserId] = useState('')
  const [awardTitleId, setAwardTitleId] = useState('')
  const [awardTitleUserId, setAwardTitleUserId] = useState('')

  // Forms
  const [questForm, setQuestForm] = useState({ title:'',category:'Design',difficulty:'Medium',rankRequired:'F',rewardXp:'100',cashReward:'',instructions:'',deadline:'' })
  const [taskForm, setTaskForm] = useState({ title:'',description:'',category:'Design',difficulty:'Medium',instructions:'',deadlineHours:'24' })
  const [adminForm, setAdminForm] = useState({ name:'',email:'',password:'',role:'MODERATOR',canTrials:false,canQuests:false,canUsers:false,canReports:false,canArena:false })
  const [arenaForm, setArenaForm] = useState({ title:'',description:'',type:'challenge',xpReward:'50',cashReward:'',endsAt:'' })
  const [achForm, setAchForm] = useState({ name:'',description:'',type:'PERMANENT',icon:'🏆',condition:'',xpBonus:'0' })
  const [titleForm, setTitleForm] = useState({ name:'',description:'',condition:'',icon:'⚔️',canExpire:false })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [s,u,q,t,a,ar,ach,ti,po,fb,fu,al,pay] = await Promise.all([
      fetch('/api/founder/stats').then(r=>r.json()).catch(()=>({})),
      fetch('/api/founder/users').then(r=>r.json()).catch(()=>({users:[]})),
      fetch('/api/founder/quests').then(r=>r.json()).catch(()=>({quests:[]})),
      fetch('/api/founder/trials').then(r=>r.json()).catch(()=>({trials:[],tasks:[]})),
      fetch('/api/founder/admins').then(r=>r.json()).catch(()=>({admins:[]})),
      fetch('/api/founder/arena').then(r=>r.json()).catch(()=>({challenges:[]})),
      fetch('/api/achievements').then(r=>r.json()).catch(()=>({achievements:[]})),
      fetch('/api/titles').then(r=>r.json()).catch(()=>({titles:[]})),
      fetch('/api/posts').then(r=>r.json()).catch(()=>({posts:[]})),
      fetch('/api/feedback').then(r=>r.json()).catch(()=>({feedbacks:[]})),
      fetch('/api/founder/feature-unlock').then(r=>r.json()).catch(()=>({unlocks:[],features:[]})),
      fetch('/api/founder/alerts').then(r=>r.json()).catch(()=>({flaggedChat:[],flaggedDMs:[],unresolvedReports:[],recentWarnings:[],riskyUsers:[]})),
      fetch('/api/founder/payouts').then(r=>r.json()).catch(()=>({quests:[],totalPending:0,totalPaid:0,pendingCount:0,paidCount:0})),
    ])
    setStats(s)
    setUsers(u.users || [])
    setQuests(q.quests || [])
    setTrials(t.trials || [])
    setTrialTasks(t.tasks || [])
    setAdmins(a.admins || [])
    setArena(ar.challenges || [])
    setAchievements(ach.achievements || [])
    setTitles(ti.titles || [])
    setPosts(po.posts || [])
    setFeedbacks(fb.feedbacks || [])
    setUnlocks(fu.unlocks || [])
    setFeatures(fu.features || [])
    setAlerts(al || {})
    setPayouts(pay || {})
    setLoading(false)
  }

  function msg(text: string) {
    setActionMsg(text)
    setTimeout(() => setActionMsg(''), 3000)
  }

  async function updateUser(id: string, action: string, value?: any) {
    await fetch(`/api/founder/user/${id}`, {
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action, value }),
    })
    msg(`User ${action} applied.`)
    loadAll()
  }

  async function deleteUser(id: string, name: string) {
    if (!window.confirm(`Permanently delete ${name}? This removes their account and all related activity. This cannot be undone.`)) return
    const res = await fetch(`/api/founder/user/${id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { msg(`Error: ${data.error || 'Could not delete user.'}`); return }
    msg('User deleted.')
    loadAll()
  }

  async function resolveReport(id: string) {
    await fetch('/api/admin/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, resolved: true }),
    })
    msg('Report resolved.')
    loadAll()
  }

  async function setPayoutStatus(id: string, status: 'PENDING' | 'PAID') {
    await fetch('/api/founder/payouts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    msg(status === 'PAID' ? 'Marked as paid.' : 'Reverted to pending.')
    loadAll()
  }

  async function reviewTrial(id: string, status: string, score?: number, notes?: string) {
    await fetch(`/api/founder/trials`, {
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id, status, score, judgeNotes: notes }),
    })
    msg(`Trial marked ${status}.`)
    loadAll()
  }

  async function postQuest() {
    setSaving(true)
    await fetch('/api/founder/quests', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(questForm),
    })
    setSaving(false)
    setQuestForm({ title:'',category:'Design',difficulty:'Medium',rankRequired:'F',rewardXp:'100',cashReward:'',instructions:'',deadline:'' })
    msg('Quest posted.')
    loadAll()
  }

  async function assignTrialTask() {
    if (!assignUserId || !assignTaskId) return
    setSaving(true)
    await fetch('/api/founder/trials', {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId: assignUserId, trialTaskId: assignTaskId }),
    })
    setSaving(false)
    setAssignUserId('')
    setAssignTaskId('')
    msg('Trial task assigned to user.')
    loadAll()
  }

  async function unlockFeatureForUser() {
    if (!unlockUserId || !unlockFeature) return
    setSaving(true)
    await fetch('/api/founder/feature-unlock', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId: unlockUserId, feature: unlockFeature, note: unlockNote }),
    })
    setSaving(false)
    setUnlockUserId('')
    setUnlockFeature('')
    setUnlockNote('')
    msg('Feature unlocked for user.')
    loadAll()
  }

  async function revokeUnlock(userId: string, feature: string) {
    await fetch('/api/founder/feature-unlock', {
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId, feature }),
    })
    msg('Feature unlock revoked.')
    loadAll()
  }

  async function replyFeedback(fbId: string) {
    if (!replyContent.trim()) return
    await fetch(`/api/feedback/${fbId}`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ content: replyContent.trim() }),
    })
    setReplyFbId('')
    setReplyContent('')
    msg('Reply sent.')
    loadAll()
  }

  async function closeFeedback(fbId: string) {
    await fetch(`/api/feedback/${fbId}`, {
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ status: 'CLOSED', isRead: true }),
    })
    msg('Feedback closed.')
    loadAll()
  }

  async function postTrialTask() {
    setSaving(true)
    await fetch('/api/founder/trial-tasks', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(taskForm),
    })
    setSaving(false)
    setTaskForm({ title:'',description:'',category:'Design',difficulty:'Medium',instructions:'',deadlineHours:'24' })
    msg('Trial task created.')
    loadAll()
  }

  async function postArena() {
    setSaving(true)
    await fetch('/api/founder/arena', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(arenaForm),
    })
    setSaving(false)
    setArenaForm({ title:'',description:'',type:'challenge',xpReward:'50',cashReward:'',endsAt:'' })
    msg('Arena event posted.')
    loadAll()
  }

  async function createAdmin() {
    setSaving(true)
    const res = await fetch('/api/founder/admins', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(adminForm),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) msg(`Error: ${data.error}`)
    else { setAdminForm({ name:'',email:'',password:'',role:'MODERATOR',canTrials:false,canQuests:false,canUsers:false,canReports:false,canArena:false }); msg('Admin account created.') }
    loadAll()
  }

  async function revokeAdmin(id: string) {
    await fetch(`/api/founder/admins`, {
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ userId: id }),
    })
    msg('Admin access revoked.')
    loadAll()
  }

  return (
    <>
      <Head><title>Founder War Room — QuestHub Guild</title></Head>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto flex flex-col gap-5">

          {/* Header */}
          <div className="relative bg-gradient-to-r from-amber-900/20 via-[#0d0017] to-amber-900/10 border border-amber-500/30 p-5 overflow-hidden">
            <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-amber-500/60" />
            <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-amber-500/60" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/40 rotate-45 flex items-center justify-center">
                  <span className="text-amber-400 -rotate-45 font-orbitron font-black text-lg">★</span>
                </div>
                <div>
                  <div className="font-orbitron text-[10px] text-amber-400/70 tracking-[0.4em] uppercase">Founder Access</div>
                  <h1 className="font-orbitron font-black text-xl text-white tracking-widest">WAR ROOM</h1>
                </div>
                {(stats?.unresolvedReports > 0 || stats?.riskyUserCount > 0) && (
                  <button onClick={() => setTab('AI Alerts')} className="flex items-center gap-1.5 ml-1 border border-red-500/40 bg-red-900/15 px-2 py-1 hover:bg-red-900/25 transition-all">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    <span className="font-orbitron text-[9px] text-red-400 tracking-widest">
                      {(stats?.unresolvedReports || 0) + (stats?.riskyUserCount || 0)} ALERTS
                    </span>
                  </button>
                )}
              </div>
              {stats && (
                <div className="flex flex-wrap gap-4 sm:ml-auto">
                  {[
                    { label:'Total Users', value: stats.totalUsers || 0 },
                    { label:'Active', value: stats.activeUsers || 0, color:'text-green-400' },
                    { label:'Open Quests', value: stats.openQuests || 0 },
                    { label:'Pending Trials', value: stats.pendingTrials || 0 },
                    { label:'Flags', value: stats.flaggedTotal || 0, color: stats.flaggedTotal > 0 ? 'text-red-400' : undefined },
                    { label:'Payouts Due', value: `$${(stats.pendingPayoutTotal || 0).toFixed(0)}`, color: stats.pendingPayoutTotal > 0 ? 'text-amber-300' : undefined },
                  ].map(({label,value,color}) => (
                    <div key={label} className="text-center">
                      <div className={`font-orbitron font-black text-xl ${color || 'text-amber-300'}`}>{value}</div>
                      <div className="font-rajdhani text-[10px] text-slate-500 tracking-widest uppercase">{label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action message */}
          {actionMsg && (
            <div className="bg-green-900/20 border border-green-500/30 px-4 py-3 font-orbitron text-xs text-green-400 tracking-widest">
              ✓ {actionMsg}
            </div>
          )}

          {/* Nav (sidebar on desktop, pill row on mobile) + Content */}
          <div className="flex flex-col lg:flex-row gap-5">
            <nav className="hidden lg:flex lg:flex-col lg:w-52 flex-shrink-0 gap-5 sticky top-4 self-start">
              {TAB_GROUPS.map(group => (
                <div key={group.label}>
                  <div className="font-orbitron text-[9px] text-slate-600 tracking-[0.3em] uppercase px-2 mb-1.5">{group.label}</div>
                  <div className="flex flex-col gap-0.5">
                    {group.tabs.map(t => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`text-left font-orbitron text-[10px] tracking-widest uppercase px-3 py-2 border-l-2 transition-all flex items-center justify-between gap-2 ${
                          tab === t
                            ? 'border-amber-400 bg-amber-900/15 text-amber-300'
                            : 'border-transparent text-slate-500 hover:border-amber-500/30 hover:text-slate-300 hover:bg-white/[0.02]'
                        }`}
                      >
                        <span>{t}</span>
                        {t === 'AI Alerts' && (stats?.unresolvedReports + stats?.riskyUserCount > 0) && (
                          <span className="font-orbitron text-[8px] bg-red-500/80 text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                            {(stats?.unresolvedReports || 0) + (stats?.riskyUserCount || 0)}
                          </span>
                        )}
                        {t === 'Payouts' && stats?.pendingPayoutCount > 0 && (
                          <span className="font-orbitron text-[8px] bg-amber-500/80 text-black rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                            {stats.pendingPayoutCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Mobile tab row */}
            <div className="flex lg:hidden flex-wrap gap-1">
              {ALL_TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`font-orbitron text-[10px] tracking-widest uppercase px-4 py-2 border transition-all ${
                    tab === t
                      ? 'border-amber-500/60 bg-amber-900/20 text-amber-300'
                      : 'border-slate-800 text-slate-600 hover:border-amber-500/20 hover:text-slate-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-4">

          {loading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
                <p className="font-orbitron text-xs text-amber-400 tracking-widest animate-pulse">LOADING WAR ROOM DATA...</p>
              </div>
            </div>
          ) : (
            <>
              {/* ── OVERVIEW TAB ── */}
              {tab === 'Overview' && stats && (
                <div className="flex flex-col gap-5">
                  {/* Status grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Active Members', value: stats.activeUsers, sub: `${stats.totalUsers} total`, color: 'text-green-400' },
                      { label: 'Suspended', value: stats.suspendedUsers, sub: `${stats.bannedUsers} banned`, color: 'text-orange-400' },
                      { label: 'Quests Open', value: stats.openQuests, sub: `${stats.claimedQuests} claimed`, color: 'text-amber-300' },
                      { label: 'Awaiting Review', value: stats.submittedQuests, sub: `${stats.approvedQuests} approved`, color: 'text-blue-400' },
                      { label: 'Pending Trials', value: stats.pendingTrials, sub: `${stats.totalTrials} total`, color: 'text-purple-400' },
                      { label: 'Unresolved Reports', value: stats.unresolvedReports, sub: 'tap to review', color: stats.unresolvedReports > 0 ? 'text-red-400' : 'text-slate-400', onClick: () => setTab('AI Alerts') },
                      { label: 'Flagged Content', value: stats.flaggedTotal, sub: `${stats.flaggedChatCount} chat · ${stats.flaggedMessageCount} DM`, color: stats.flaggedTotal > 0 ? 'text-red-400' : 'text-slate-400', onClick: () => setTab('AI Alerts') },
                      { label: 'Payouts Due', value: `$${(stats.pendingPayoutTotal || 0).toFixed(2)}`, sub: `${stats.pendingPayoutCount} quest(s)`, color: stats.pendingPayoutTotal > 0 ? 'text-amber-300' : 'text-slate-400', onClick: () => setTab('Payouts') },
                    ].map(card => (
                      <div key={card.label}
                        onClick={card.onClick}
                        className={`bg-[#0d0017] border border-amber-500/15 p-4 ${card.onClick ? 'cursor-pointer hover:border-amber-500/40 transition-all' : ''}`}>
                        <div className={`font-orbitron font-black text-2xl ${card.color}`}>{card.value ?? 0}</div>
                        <div className="font-rajdhani text-xs text-slate-500 mt-1">{card.label}</div>
                        <div className="font-rajdhani text-[10px] text-slate-600 mt-0.5">{card.sub}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid lg:grid-cols-2 gap-5">
                    {/* Recent activity feed */}
                    <div className="bg-[#0d0017] border border-amber-500/15 p-4">
                      <div className="font-orbitron text-xs text-amber-400 tracking-widest uppercase mb-3">Recent Activity</div>
                      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
                        {(stats.recentActivity || []).length === 0 && (
                          <div className="font-rajdhani text-sm text-slate-600">No activity logged yet.</div>
                        )}
                        {(stats.recentActivity || []).map((log: any) => (
                          <div key={log.id} className="flex items-start justify-between gap-3 py-1.5 border-b border-amber-500/5 last:border-0">
                            <div className="min-w-0">
                              <div className="font-rajdhani text-sm text-slate-300 truncate">{log.details || log.action}</div>
                              <div className="font-orbitron text-[9px] text-slate-600 tracking-wider uppercase mt-0.5">
                                {log.user?.nickname || log.user?.name || 'System'} · {log.action}
                              </div>
                            </div>
                            <div className="font-rajdhani text-[10px] text-slate-600 whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick alerts preview */}
                    <div className="bg-[#0d0017] border border-red-500/15 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-orbitron text-xs text-red-400 tracking-widest uppercase">Needs Attention</div>
                        <button onClick={() => setTab('AI Alerts')} className="font-orbitron text-[9px] text-amber-400 hover:text-amber-300 tracking-widest uppercase">View All →</button>
                      </div>
                      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
                        {(alerts.unresolvedReports || []).length === 0 && (alerts.riskyUsers || []).length === 0 && (alerts.flaggedChat || []).length === 0 && (alerts.flaggedDMs || []).length === 0 && (
                          <div className="font-rajdhani text-sm text-slate-600">All clear — nothing flagged right now.</div>
                        )}
                        {(alerts.unresolvedReports || []).slice(0, 3).map((r: any) => (
                          <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-red-500/5">
                            <span className="font-rajdhani text-sm text-slate-300 truncate">Report: {r.reportedAbout?.nickname || r.reportedAbout?.name || 'Unknown'}</span>
                            <span className="font-orbitron text-[9px] text-red-400 uppercase">Report</span>
                          </div>
                        ))}
                        {(alerts.riskyUsers || []).slice(0, 3).map((u: any) => (
                          <div key={u.id} className="flex items-center justify-between py-1.5 border-b border-red-500/5">
                            <span className="font-rajdhani text-sm text-slate-300 truncate">{u.nickname || u.name} — trust {u.trustLevel}</span>
                            <span className="font-orbitron text-[9px] text-orange-400 uppercase">Trust</span>
                          </div>
                        ))}
                        {(alerts.flaggedChat || []).slice(0, 2).map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-red-500/5">
                            <span className="font-rajdhani text-sm text-slate-300 truncate">Flagged chat from {m.user?.nickname || m.user?.name}</span>
                            <span className="font-orbitron text-[9px] text-red-400 uppercase">Chat</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── USERS TAB ── */}
              {tab === 'Users' && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label:'Total',   value: users.length,                                      color:'text-white'  },
                      { label:'Active',  value: users.filter(u=>u.status==='ACTIVE').length,        color:'text-green-400' },
                      { label:'Banned',  value: users.filter(u=>u.status==='BANNED').length,        color:'text-red-400'   },
                      { label:'Trial',   value: users.filter(u=>u.role==='TRIAL_MEMBER').length,    color:'text-yellow-400'},
                    ].map(({label,value,color}) => (
                      <div key={label} className="bg-[#0d0017] border border-purple-500/20 p-4 text-center">
                        <div className={`font-orbitron font-black text-2xl ${color}`}>{value}</div>
                        <div className="font-rajdhani text-xs text-slate-600 tracking-widest uppercase">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#0d0017] border border-purple-500/20 overflow-hidden">
                    <div className="px-5 py-3 border-b border-purple-500/15 flex items-center justify-between">
                      <h3 className="font-orbitron text-xs text-white tracking-widest uppercase">All Users</h3>
                      <span className="font-rajdhani text-xs text-slate-600">{users.length} registered</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-purple-500/10">
                            {['User','Role','Rank','XP','Status','Actions'].map(h => (
                              <th key={h} className="px-4 py-3 text-left font-orbitron text-[9px] text-slate-600 tracking-widest uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u:any) => (
                            <tr key={u.id} className="border-b border-purple-500/10 hover:bg-purple-900/5 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-orbitron text-xs text-white">{u.nickname || u.name}</div>
                                <div className="font-rajdhani text-[10px] text-slate-600">{u.email}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-rajdhani text-xs text-slate-400">{u.role.replace('_',' ')}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`font-orbitron font-black text-sm ${RANK_COLORS[u.rank] || 'text-slate-400'}`}>{u.rank}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-orbitron text-xs text-purple-400">{u.xp}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`font-orbitron text-[9px] px-2 py-0.5 border ${
                                  u.status==='ACTIVE' ? 'text-green-400 border-green-500/30' :
                                  u.status==='BANNED' ? 'text-red-400 border-red-500/30' :
                                  'text-yellow-400 border-yellow-500/30'
                                }`}>{u.status}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {['F','E','D','C','B','A','S','SS','SSS'].map(rank => (
                                    <button key={rank} onClick={() => updateUser(u.id,'setRank',rank)}
                                      className={`font-orbitron text-[8px] px-1.5 py-0.5 border transition-all ${u.rank===rank ? 'border-purple-400/60 text-purple-300' : 'border-slate-800 text-slate-700 hover:border-purple-500/30 hover:text-slate-400'}`}>
                                      {rank}
                                    </button>
                                  ))}
                                  <button onClick={() => updateUser(u.id, u.status==='BANNED'?'unban':'ban')}
                                    className={`font-orbitron text-[8px] px-2 py-0.5 border transition-all ml-1 ${u.status==='BANNED'?'border-green-500/40 text-green-400 hover:bg-green-900/20':'border-red-500/30 text-red-400 hover:bg-red-900/20'}`}>
                                    {u.status==='BANNED'?'UNBAN':'BAN'}
                                  </button>
                                  {u.status==='ACTIVE' && (
                                    <button onClick={() => updateUser(u.id,'suspend')}
                                      className="font-orbitron text-[8px] px-2 py-0.5 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-900/20 transition-all">
                                      SUSPEND
                                    </button>
                                  )}
                                  <button onClick={() => updateUser(u.id,'warn')}
                                    className="font-orbitron text-[8px] px-2 py-0.5 border border-orange-500/30 text-orange-400 hover:bg-orange-900/20 transition-all">
                                    WARN
                                  </button>
                                  {u.role !== 'FOUNDER' && (
                                    <button onClick={() => deleteUser(u.id, u.nickname || u.name || u.email)}
                                      className="font-orbitron text-[8px] px-2 py-0.5 border border-red-600/50 text-red-500 hover:bg-red-900/30 transition-all">
                                      DELETE
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── QUESTS TAB ── */}
              {tab === 'Quests' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Post new quest */}
                  <div className="bg-[#0d0017] border border-amber-500/20 p-5">
                    <h3 className="font-orbitron text-xs text-amber-400 tracking-widest uppercase mb-5 pb-3 border-b border-amber-500/20">
                      Post New Quest
                    </h3>
                    <div className="flex flex-col gap-4">
                      <GlowInput label="Quest Title *" placeholder="Operation: Brand Revamp" value={questForm.title} onChange={e=>setQuestForm(p=>({...p,title:e.target.value}))} />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Category</label>
                          <select value={questForm.category} onChange={e=>setQuestForm(p=>({...p,category:e.target.value}))}
                            className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5 focus:outline-none focus:border-purple-400/70 transition-all">
                            {['Design','Writing','Coding','Research','Marketing','Social Media','Video Work','Other'].map(c=><option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Difficulty</label>
                          <select value={questForm.difficulty} onChange={e=>setQuestForm(p=>({...p,difficulty:e.target.value}))}
                            className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5 focus:outline-none focus:border-purple-400/70 transition-all">
                            {['Easy','Medium','Hard','Expert'].map(d=><option key={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Min Rank</label>
                          <select value={questForm.rankRequired} onChange={e=>setQuestForm(p=>({...p,rankRequired:e.target.value}))}
                            className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5 focus:outline-none focus:border-purple-400/70 transition-all">
                            {['F','E','D','C','B','A','S','SS','SSS'].map(r=><option key={r}>{r}</option>)}
                          </select>
                        </div>
                        <div>
                          <GlowInput label="XP Reward" type="number" placeholder="100" value={questForm.rewardXp} onChange={e=>setQuestForm(p=>({...p,rewardXp:e.target.value}))} />
                        </div>
                        <div>
                          <GlowInput label="Cash Reward ($, optional)" type="number" placeholder="0.00" value={questForm.cashReward} onChange={e=>setQuestForm(p=>({...p,cashReward:e.target.value}))} />
                        </div>
                      </div>
                      <div>
                        <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Deadline (optional)</label>
                        <input type="datetime-local" value={questForm.deadline} onChange={e=>setQuestForm(p=>({...p,deadline:e.target.value}))}
                          className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5 focus:outline-none focus:border-purple-400/70 transition-all [color-scheme:dark]" />
                      </div>
                      <GlowTextarea label="Instructions *" placeholder="Full mission briefing..." rows={4} value={questForm.instructions} onChange={e=>setQuestForm(p=>({...p,instructions:e.target.value}))} />
                      <GlowButton variant="primary" size="md" loading={saving} onClick={postQuest}>Post Quest</GlowButton>
                    </div>
                  </div>

                  {/* Existing quests */}
                  <div className="bg-[#0d0017] border border-purple-500/20 p-5">
                    <h3 className="font-orbitron text-xs text-white tracking-widest uppercase mb-5 pb-3 border-b border-purple-500/15">
                      All Quests ({quests.length})
                    </h3>
                    <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">
                      {quests.length === 0 ? (
                        <p className="font-rajdhani text-slate-600 text-sm text-center py-8">No quests posted yet.</p>
                      ) : quests.map((q:any) => (
                        <div key={q.id} className="border border-purple-500/15 p-3 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-orbitron text-xs text-white truncate">{q.title}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-orbitron text-[9px] text-purple-400/70">{q.category}</span>
                              <span className="font-orbitron text-[9px] text-slate-600">{q.difficulty}</span>
                              <span className={`font-orbitron text-[9px] ${q.status==='OPEN'?'text-green-400':'text-yellow-400'}`}>{q.status}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            {q.status === 'OPEN' && (
                              <button onClick={async()=>{await fetch(`/api/founder/quests`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:q.id})});loadAll()}}
                                className="font-orbitron text-[8px] px-2 py-1 border border-red-500/30 text-red-400 hover:bg-red-900/20 transition-all">
                                REMOVE
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TRIALS TAB ── */}
              {tab === 'Trials' && (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Create Trial Task */}
                    <div className="bg-[#0d0017] border border-amber-500/20 p-5">
                      <h3 className="font-orbitron text-xs text-amber-400 tracking-widest uppercase mb-5 pb-3 border-b border-amber-500/20">
                        Create Trial Task
                      </h3>
                      <div className="flex flex-col gap-4">
                        <GlowInput label="Task Title *" placeholder="Design a logo for X" value={taskForm.title} onChange={e=>setTaskForm(p=>({...p,title:e.target.value}))} />
                        <GlowTextarea label="Description *" placeholder="What needs to be done..." rows={2} value={taskForm.description} onChange={e=>setTaskForm(p=>({...p,description:e.target.value}))} />
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Category</label>
                            <select value={taskForm.category} onChange={e=>setTaskForm(p=>({...p,category:e.target.value}))}
                              className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5 focus:outline-none focus:border-purple-400/70 transition-all">
                              {['Design','Writing','Coding','Research','Marketing','Video','Other'].map(c=><option key={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Difficulty</label>
                            <select value={taskForm.difficulty} onChange={e=>setTaskForm(p=>({...p,difficulty:e.target.value}))}
                              className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5 focus:outline-none focus:border-purple-400/70 transition-all">
                              {['Easy','Medium','Hard'].map(d=><option key={d}>{d}</option>)}
                            </select>
                          </div>
                        </div>
                        <GlowInput label="Deadline (hours)" type="number" placeholder="24" value={taskForm.deadlineHours} onChange={e=>setTaskForm(p=>({...p,deadlineHours:e.target.value}))} />
                        <GlowTextarea label="Full Instructions *" placeholder="Step-by-step instructions..." rows={3} value={taskForm.instructions} onChange={e=>setTaskForm(p=>({...p,instructions:e.target.value}))} />
                        <GlowButton variant="primary" size="md" loading={saving} onClick={postTrialTask}>Create Task</GlowButton>
                      </div>
                    </div>

                    {/* Active Trial Tasks */}
                    <div className="bg-[#0d0017] border border-purple-500/20 p-5">
                      <h3 className="font-orbitron text-xs text-white tracking-widest uppercase mb-4 pb-3 border-b border-purple-500/15">
                        Trial Task Pool ({trialTasks.length})
                      </h3>
                      <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                        {trialTasks.length === 0 ? (
                          <p className="font-rajdhani text-slate-600 text-sm text-center py-6">No trial tasks yet.</p>
                        ) : trialTasks.map((t:any) => (
                          <div key={t.id} className="border border-purple-500/10 p-3">
                            <div className="font-orbitron text-xs text-white mb-1">{t.title}</div>
                            <div className="flex items-center gap-2">
                              <span className="font-orbitron text-[9px] text-purple-400/70">{t.category}</span>
                              <span className="font-orbitron text-[9px] text-slate-600">{t.difficulty}</span>
                              <span className="font-rajdhani text-[10px] text-slate-600">⏱ {t.deadlineHours}h</span>
                              <span className={`font-orbitron text-[9px] ml-auto ${t.isActive?'text-green-400':'text-slate-600'}`}>
                                {t.isActive?'ACTIVE':'INACTIVE'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Assign trial task to specific user */}
                  <div className="bg-[#0d0017] border border-amber-500/20 p-5">
                    <h3 className="font-orbitron text-xs text-amber-400 tracking-widest uppercase mb-4 pb-3 border-b border-amber-500/20">
                      Assign Trial Task to Specific User
                    </h3>
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Select User (with application)</label>
                        <select value={assignUserId} onChange={e=>setAssignUserId(e.target.value)}
                          className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5 focus:outline-none focus:border-purple-400/70 transition-all">
                          <option value="">-- Select user --</option>
                          {trials.map((t:any) => (
                            <option key={t.userId} value={t.userId}>
                              {t.user?.nickname || t.user?.name} ({t.user?.email})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Select Task</label>
                        <select value={assignTaskId} onChange={e=>setAssignTaskId(e.target.value)}
                          className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5 focus:outline-none focus:border-purple-400/70 transition-all">
                          <option value="">-- Select task --</option>
                          {trialTasks.filter((t:any)=>t.isActive).map((t:any) => (
                            <option key={t.id} value={t.id}>{t.title} ({t.category} · {t.difficulty})</option>
                          ))}
                        </select>
                      </div>
                      <GlowButton variant="primary" size="sm" loading={saving} onClick={assignTrialTask}
                        disabled={!assignUserId || !assignTaskId}>
                        Assign Task
                      </GlowButton>
                      <p className="font-rajdhani text-xs text-slate-600">
                        The user will see the assigned task on their Trial page.
                      </p>
                    </div>
                  </div>

                  {/* Trial Applications */}
                  <div className="bg-[#0d0017] border border-purple-500/20 p-5">
                    <h3 className="font-orbitron text-xs text-white tracking-widest uppercase mb-4 pb-3 border-b border-purple-500/15">
                      Trial Applications ({trials.length})
                    </h3>
                    <div className="flex flex-col gap-3">
                      {trials.length === 0 ? (
                        <p className="font-rajdhani text-slate-600 text-sm text-center py-6">No trial applications.</p>
                      ) : trials.map((t:any) => (
                        <TrialCard key={t.id} trial={t} onReview={reviewTrial} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ADMINS TAB ── */}
              {tab === 'Admins' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Create Admin */}
                  <div className="bg-[#0d0017] border border-amber-500/20 p-5">
                    <h3 className="font-orbitron text-xs text-amber-400 tracking-widest uppercase mb-5 pb-3 border-b border-amber-500/20">
                      Create Admin Account
                    </h3>
                    <div className="flex flex-col gap-4">
                      <GlowInput label="Full Name *" placeholder="Admin name" value={adminForm.name} onChange={e=>setAdminForm(p=>({...p,name:e.target.value}))} />
                      <GlowInput label="Email *" type="email" placeholder="admin@questhub.io" value={adminForm.email} onChange={e=>setAdminForm(p=>({...p,email:e.target.value}))} />
                      <GlowInput label="Temp Password *" type="password" placeholder="Temporary password" value={adminForm.password} onChange={e=>setAdminForm(p=>({...p,password:e.target.value}))} />
                      <div>
                        <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Admin Role</label>
                        <select value={adminForm.role} onChange={e=>setAdminForm(p=>({...p,role:e.target.value}))}
                          className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5 focus:outline-none focus:border-purple-400/70 transition-all">
                          {['MODERATOR','COORDINATOR','ADMIN'].map(r=><option key={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-2">Permissions</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            {key:'canTrials',label:'Trials'},
                            {key:'canQuests',label:'Quests'},
                            {key:'canUsers',label:'Users'},
                            {key:'canReports',label:'Reports'},
                            {key:'canArena',label:'Arena'},
                          ].map(({key,label}) => (
                            <label key={key} className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={(adminForm as any)[key]}
                                onChange={e=>setAdminForm(p=>({...p,[key]:e.target.checked}))}
                                className="accent-purple-500" />
                              <span className="font-rajdhani text-sm text-slate-400">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <GlowButton variant="primary" size="md" loading={saving} onClick={createAdmin}>Create Admin</GlowButton>
                      <p className="font-rajdhani text-xs text-slate-600">
                        Admin will log in at <span className="text-purple-400">/admin-login</span> with these credentials.
                      </p>
                    </div>
                  </div>

                  {/* Existing Admins */}
                  <div className="bg-[#0d0017] border border-purple-500/20 p-5">
                    <h3 className="font-orbitron text-xs text-white tracking-widest uppercase mb-4 pb-3 border-b border-purple-500/15">
                      Active Admins ({admins.length})
                    </h3>
                    <div className="flex flex-col gap-3">
                      {admins.length === 0 ? (
                        <p className="font-rajdhani text-slate-600 text-sm text-center py-6">No admin accounts yet.</p>
                      ) : admins.map((a:any) => (
                        <div key={a.id} className="border border-purple-500/15 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-orbitron text-xs text-white">{a.name || a.nickname}</div>
                              <div className="font-rajdhani text-xs text-slate-500 mt-0.5">{a.email}</div>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                <span className="font-orbitron text-[9px] border border-red-500/30 text-red-300 px-2 py-0.5">{a.role.replace('_',' ')}</span>
                                {a.adminPermission && Object.entries(a.adminPermission)
                                  .filter(([k,v]) => k.startsWith('can') && v)
                                  .map(([k]) => (
                                    <span key={k} className="font-orbitron text-[9px] border border-slate-700 text-slate-500 px-2 py-0.5">
                                      {k.replace('can','').toUpperCase()}
                                    </span>
                                  ))
                                }
                              </div>
                            </div>
                            <button onClick={() => revokeAdmin(a.id)}
                              className="font-orbitron text-[9px] px-3 py-1.5 border border-red-500/40 text-red-400 hover:bg-red-900/20 transition-all flex-shrink-0">
                              REVOKE
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ARENA TAB ── */}
              {tab === 'Arena' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[#0d0017] border border-amber-500/20 p-5">
                    <h3 className="font-orbitron text-xs text-amber-400 tracking-widest uppercase mb-5 pb-3 border-b border-amber-500/20">
                      Post Arena Event
                    </h3>
                    <div className="flex flex-col gap-4">
                      <GlowInput label="Event Title *" placeholder="Weekly Guild War" value={arenaForm.title} onChange={e=>setArenaForm(p=>({...p,title:e.target.value}))} />
                      <GlowTextarea label="Description *" placeholder="What's the challenge?" rows={3} value={arenaForm.description} onChange={e=>setArenaForm(p=>({...p,description:e.target.value}))} />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Type</label>
                          <select value={arenaForm.type} onChange={e=>setArenaForm(p=>({...p,type:e.target.value}))}
                            className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5 focus:outline-none focus:border-purple-400/70 transition-all">
                            {['challenge','tournament','poll','mini_game','guild_war'].map(t=><option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <GlowInput label="XP Reward" type="number" placeholder="50" value={arenaForm.xpReward} onChange={e=>setArenaForm(p=>({...p,xpReward:e.target.value}))} />
                        <GlowInput label="Cash Reward ($, optional)" type="number" placeholder="0" value={arenaForm.cashReward} onChange={e=>setArenaForm(p=>({...p,cashReward:e.target.value}))} />
                        <div>
                          <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">End Date *</label>
                          <input type="datetime-local" value={arenaForm.endsAt} onChange={e=>setArenaForm(p=>({...p,endsAt:e.target.value}))}
                            className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5 focus:outline-none focus:border-purple-400/70 transition-all [color-scheme:dark]" />
                        </div>
                      </div>
                      <GlowButton variant="primary" size="md" loading={saving} onClick={postArena}>Post Event</GlowButton>
                    </div>
                  </div>

                  <div className="bg-[#0d0017] border border-purple-500/20 p-5">
                    <h3 className="font-orbitron text-xs text-white tracking-widest uppercase mb-4 pb-3 border-b border-purple-500/15">
                      Active Events ({arena.length})
                    </h3>
                    <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">
                      {arena.length === 0 ? (
                        <p className="font-rajdhani text-slate-600 text-sm text-center py-6">No events posted yet.</p>
                      ) : arena.map((e:any) => (
                        <div key={e.id} className="border border-purple-500/10 p-3">
                          <div className="font-orbitron text-xs text-white mb-1">{e.title}</div>
                          <div className="flex items-center gap-3 text-[10px]">
                            <span className="font-orbitron text-purple-400/70">{e.type}</span>
                            <span className="font-orbitron text-green-400">+{e.xpReward}XP</span>
                            {e.cashReward && <span className="font-orbitron text-amber-400">${e.cashReward}</span>}
                            <span className={`ml-auto font-orbitron ${new Date(e.endsAt)>new Date()?'text-green-400':'text-slate-600'}`}>
                              {new Date(e.endsAt)>new Date()?'LIVE':'ENDED'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ACHIEVEMENTS TAB ── */}
              {tab === 'Achievements' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Create Achievement */}
                  <div className="bg-[#0d0017] border border-purple-500/20 p-5">
                    <h3 className="font-orbitron text-xs text-white tracking-widest uppercase mb-4 pb-3 border-b border-purple-500/15">
                      Create Achievement
                    </h3>
                    <div className="flex flex-col gap-3">
                      <GlowInput label="Name" placeholder="e.g. Trial Beast" value={achForm.name} onChange={e=>setAchForm(p=>({...p,name:e.target.value}))} />
                      <GlowTextarea label="Description" placeholder="What this achievement means..." value={achForm.description} onChange={e=>setAchForm(p=>({...p,description:e.target.value}))} rows={2} />
                      <GlowTextarea label="Condition (AI prompt or rule)" placeholder="e.g. Complete 5 quests at rank D or above" value={achForm.condition} onChange={e=>setAchForm(p=>({...p,condition:e.target.value}))} rows={2} />
                      <div className="grid grid-cols-2 gap-3">
                        <GlowInput label="Icon (emoji)" placeholder="🏆" value={achForm.icon} onChange={e=>setAchForm(p=>({...p,icon:e.target.value}))} />
                        <GlowInput label="XP Bonus" type="number" placeholder="0" value={achForm.xpBonus} onChange={e=>setAchForm(p=>({...p,xpBonus:e.target.value}))} />
                      </div>
                      <div>
                        <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Type</label>
                        <select value={achForm.type} onChange={e=>setAchForm(p=>({...p,type:e.target.value}))}
                          className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5 focus:outline-none focus:border-purple-400/70">
                          <option value="PERMANENT">Permanent</option>
                          <option value="COMPETITIVE">Competitive</option>
                          <option value="TEMPORARY">Temporary</option>
                        </select>
                      </div>
                      <GlowButton variant="primary" size="md" loading={saving} onClick={async()=>{
                        setSaving(true)
                        const r=await fetch('/api/achievements',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(achForm)})
                        setSaving(false)
                        if(r.ok){setAchForm({name:'',description:'',type:'PERMANENT',icon:'🏆',condition:'',xpBonus:'0'});msg('Achievement created.');loadAll()}
                        else{const d=await r.json();msg('Error: '+d.error)}
                      }}>Create Achievement</GlowButton>
                    </div>
                  </div>

                  {/* Award + List */}
                  <div className="flex flex-col gap-4">
                    <div className="bg-[#0d0017] border border-purple-500/20 p-5">
                      <h3 className="font-orbitron text-xs text-white tracking-widest uppercase mb-4 pb-3 border-b border-purple-500/15">Award to Member</h3>
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Achievement</label>
                          <select value={awardAchId} onChange={e=>setAwardAchId(e.target.value)}
                            className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5 focus:outline-none focus:border-purple-400/70">
                            <option value="">Select achievement</option>
                            {achievements.map((a:any)=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Member</label>
                          <select value={awardAchUserId} onChange={e=>setAwardAchUserId(e.target.value)}
                            className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5 focus:outline-none focus:border-purple-400/70">
                            <option value="">Select member</option>
                            {users.map((u:any)=><option key={u.id} value={u.id}>{u.nickname||u.name} ({u.rank})</option>)}
                          </select>
                        </div>
                        <GlowButton variant="primary" size="sm" onClick={async()=>{
                          if(!awardAchId||!awardAchUserId)return msg('Select both')
                          const r=await fetch('/api/achievements/award',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:awardAchUserId,achievementId:awardAchId})})
                          const d=await r.json()
                          r.ok?msg('Achievement awarded!'):msg('Error: '+d.error)
                        }}>Award Achievement</GlowButton>
                      </div>
                    </div>

                    <div className="bg-[#0d0017] border border-purple-500/20 p-5">
                      <h3 className="font-orbitron text-xs text-white tracking-widest uppercase mb-3">All Achievements ({achievements.length})</h3>
                      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                        {achievements.length===0?<p className="font-rajdhani text-slate-600 text-sm text-center py-4">None created yet.</p>:
                        achievements.map((a:any)=>(
                          <div key={a.id} className="border border-purple-500/10 p-3 flex items-center gap-3">
                            <span className="text-lg">{a.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-orbitron text-[10px] text-white">{a.name}</div>
                              <div className="font-rajdhani text-[10px] text-slate-600">{a.type} · {a.awardedTo?.length||0} earned</div>
                            </div>
                            {a.xpBonus>0&&<span className="font-orbitron text-[10px] text-purple-400">+{a.xpBonus}XP</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TITLES TAB ── */}
              {tab === 'Titles' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-[#0d0017] border border-purple-500/20 p-5">
                    <h3 className="font-orbitron text-xs text-white tracking-widest uppercase mb-4 pb-3 border-b border-purple-500/15">Create Title</h3>
                    <div className="flex flex-col gap-3">
                      <GlowInput label="Title Name" placeholder="e.g. Shadow Worker" value={titleForm.name} onChange={e=>setTitleForm(p=>({...p,name:e.target.value}))} />
                      <GlowTextarea label="Description" placeholder="What this title represents..." value={titleForm.description} onChange={e=>setTitleForm(p=>({...p,description:e.target.value}))} rows={2} />
                      <GlowTextarea label="Condition" placeholder="When this title is awarded..." value={titleForm.condition} onChange={e=>setTitleForm(p=>({...p,condition:e.target.value}))} rows={2} />
                      <div className="grid grid-cols-2 gap-3">
                        <GlowInput label="Icon (emoji)" placeholder="⚔️" value={titleForm.icon} onChange={e=>setTitleForm(p=>({...p,icon:e.target.value}))} />
                        <label className="flex items-center gap-2 cursor-pointer mt-5">
                          <input type="checkbox" checked={titleForm.canExpire} onChange={e=>setTitleForm(p=>({...p,canExpire:e.target.checked}))} className="w-4 h-4 accent-purple-500" />
                          <span className="font-rajdhani text-sm text-slate-400">Can expire</span>
                        </label>
                      </div>
                      <GlowButton variant="primary" size="md" loading={saving} onClick={async()=>{
                        setSaving(true)
                        const r=await fetch('/api/titles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(titleForm)})
                        setSaving(false)
                        if(r.ok){setTitleForm({name:'',description:'',condition:'',icon:'⚔️',canExpire:false});msg('Title created.');loadAll()}
                        else{const d=await r.json();msg('Error: '+d.error)}
                      }}>Create Title</GlowButton>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="bg-[#0d0017] border border-purple-500/20 p-5">
                      <h3 className="font-orbitron text-xs text-white tracking-widest uppercase mb-4 pb-3 border-b border-purple-500/15">Award Title</h3>
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Title</label>
                          <select value={awardTitleId} onChange={e=>setAwardTitleId(e.target.value)}
                            className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5">
                            <option value="">Select title</option>
                            {titles.map((t:any)=><option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Member</label>
                          <select value={awardTitleUserId} onChange={e=>setAwardTitleUserId(e.target.value)}
                            className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5">
                            <option value="">Select member</option>
                            {users.map((u:any)=><option key={u.id} value={u.id}>{u.nickname||u.name} ({u.rank})</option>)}
                          </select>
                        </div>
                        <GlowButton variant="primary" size="sm" onClick={async()=>{
                          if(!awardTitleId||!awardTitleUserId)return msg('Select both')
                          const r=await fetch('/api/titles/award',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:awardTitleUserId,titleId:awardTitleId,setActive:true})})
                          const d=await r.json()
                          r.ok?msg('Title awarded!'):msg('Error: '+d.error)
                        }}>Award Title</GlowButton>
                      </div>
                    </div>

                    <div className="bg-[#0d0017] border border-purple-500/20 p-5">
                      <h3 className="font-orbitron text-xs text-white tracking-widest uppercase mb-3">All Titles ({titles.length})</h3>
                      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                        {titles.length===0?<p className="font-rajdhani text-slate-600 text-sm text-center py-4">None created yet.</p>:
                        titles.map((t:any)=>(
                          <div key={t.id} className="border border-purple-500/10 p-3 flex items-center gap-3">
                            <span className="text-lg">{t.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-orbitron text-[10px] text-white">{t.name}</div>
                              <div className="font-rajdhani text-[10px] text-slate-600">{t.awardedTo?.length||0} holders{t.canExpire?' · can expire':''}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TRUST TAB ── */}
              {tab === 'Trust' && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label:'Avg Trust', value: users.length?Math.round(users.reduce((s:number,u:any)=>s+(u.trustScore||50),0)/users.length):'—', color:'text-purple-400' },
                      { label:'Elite (90+)', value: users.filter((u:any)=>(u.trustScore||50)>=90).length, color:'text-amber-300' },
                      { label:'Watch (<35)', value: users.filter((u:any)=>(u.trustScore||50)<35).length, color:'text-orange-400' },
                      { label:'Risk (<15)',  value: users.filter((u:any)=>(u.trustScore||50)<15).length, color:'text-red-400' },
                    ].map(({label,value,color})=>(
                      <div key={label} className="bg-[#0d0017] border border-purple-500/20 p-4 text-center">
                        <div className={`font-orbitron font-black text-2xl ${color}`}>{value}</div>
                        <div className="font-rajdhani text-xs text-slate-600 tracking-widest uppercase">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Manual trust event */}
                    <div className="bg-[#0d0017] border border-purple-500/20 p-5">
                      <h3 className="font-orbitron text-xs text-white tracking-widest uppercase mb-4 pb-3 border-b border-purple-500/15">Apply Trust Event</h3>
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Member</label>
                          <select value={trustUserId} onChange={e=>setTrustUserId(e.target.value)}
                            className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5">
                            <option value="">Select member</option>
                            {users.map((u:any)=><option key={u.id} value={u.id}>{u.nickname||u.name} (Trust: {u.trustScore||50})</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Event Type</label>
                          <select value={trustAction} onChange={e=>setTrustAction(e.target.value)}
                            className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5">
                            {['QUEST_COMPLETED','QUEST_APPROVED','QUEST_LATE','QUEST_ABANDONED','MESSAGE_FLAGGED','WARNING_ISSUED','RANK_UP','REPORT_MADE','VERIFICATION_SOCIAL','VERIFICATION_LOCATION','VERIFICATION_FACE','VERIFICATION_ID'].map(a=><option key={a} value={a}>{a.replace(/_/g,' ')}</option>)}
                          </select>
                        </div>
                        <GlowInput label="Reason (optional)" placeholder="Brief note..." value={trustReason} onChange={e=>setTrustReason(e.target.value)} />
                        <GlowButton variant="primary" size="sm" onClick={async()=>{
                          if(!trustUserId)return msg('Select a member')
                          const r=await fetch('/api/trust',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:trustUserId,action:trustAction,reason:trustReason,source:'FOUNDER'})})
                          const d=await r.json()
                          r.ok?msg(`Trust event applied. New score: ${d.trustScore} (${d.trustLevel})`):msg('Error: '+d.error)
                          loadAll()
                        }}>Apply Event</GlowButton>
                      </div>
                    </div>

                    {/* AI Trial Evaluation */}
                    <div className="bg-[#0d0017] border border-purple-500/20 p-5">
                      <h3 className="font-orbitron text-xs text-white tracking-widest uppercase mb-4 pb-3 border-b border-purple-500/15">AI Trial Evaluation</h3>
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Trial</label>
                          <select value={aiEvalId} onChange={e=>setAiEvalId(e.target.value)}
                            className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5">
                            <option value="">Select trial</option>
                            {trials.map((t:any)=><option key={t.id} value={t.id}>{t.user?.nickname||t.user?.name} — {t.status}</option>)}
                          </select>
                        </div>
                        <GlowButton variant="primary" size="sm" loading={aiEvalLoading} onClick={async()=>{
                          if(!aiEvalId)return msg('Select a trial')
                          setAiEvalLoading(true)
                          const r=await fetch('/api/ai/evaluate-trial',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({trialId:aiEvalId})})
                          const d=await r.json()
                          setAiEvalLoading(false)
                          if(r.ok){setAiEvalResult(d.result);msg('AI evaluation complete.')}
                          else msg('Error: '+d.error)
                        }}>Run AI Evaluation</GlowButton>
                        {aiEvalResult&&(
                          <div className="bg-black/40 border border-purple-500/20 p-3 flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                              <span className="font-orbitron font-black text-2xl text-white">{aiEvalResult.score}</span>
                              <span className={`font-orbitron text-xs px-2 py-1 border ${aiEvalResult.recommendation==='ACCEPT'?'text-green-400 border-green-500/40':aiEvalResult.recommendation==='REJECT'?'text-red-400 border-red-500/40':'text-yellow-400 border-yellow-500/40'}`}>{aiEvalResult.recommendation}</span>
                            </div>
                            <p className="font-rajdhani text-slate-400 text-xs">{aiEvalResult.summary}</p>
                            {aiEvalResult.concerns?.length>0&&<p className="font-rajdhani text-red-400 text-xs">⚠ {aiEvalResult.concerns.join(', ')}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Trust leaderboard */}
                  <div className="bg-[#0d0017] border border-purple-500/20 overflow-hidden">
                    <div className="px-5 py-3 border-b border-purple-500/15">
                      <h3 className="font-orbitron text-xs text-white tracking-widest uppercase">Trust Scores</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="border-b border-purple-500/10">
                          {['Member','Trust Score','Level','Rank','Status'].map(h=><th key={h} className="px-4 py-3 text-left font-orbitron text-[9px] text-slate-600 tracking-widest uppercase">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {[...users].sort((a:any,b:any)=>(b.trustScore||50)-(a.trustScore||50)).map((u:any)=>{
                            const ts=u.trustScore||50
                            const color=ts>=90?'text-amber-300':ts>=75?'text-green-400':ts>=55?'text-blue-400':ts>=35?'text-slate-400':ts>=15?'text-orange-400':'text-red-400'
                            const level=ts>=90?'ELITE':ts>=75?'TRUSTED':ts>=55?'RISING':ts>=35?'NEW':ts>=15?'WATCH':'RISK'
                            return(
                              <tr key={u.id} className="border-b border-purple-500/10 hover:bg-purple-900/5">
                                <td className="px-4 py-3"><div className="font-orbitron text-xs text-white">{u.nickname||u.name}</div></td>
                                <td className="px-4 py-3"><span className={`font-orbitron font-black text-sm ${color}`}>{ts}</span></td>
                                <td className="px-4 py-3"><span className={`font-orbitron text-[10px] ${color}`}>{level}</span></td>
                                <td className="px-4 py-3"><span className={`font-orbitron font-black text-sm ${RANK_COLORS[u.rank]||'text-slate-400'}`}>{u.rank}</span></td>
                                <td className="px-4 py-3"><span className="font-rajdhani text-xs text-slate-500">{u.status}</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── POSTS TAB ── */}
              {tab === 'Posts' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[#0d0017] border border-purple-500/20 overflow-hidden">
                    <div className="px-5 py-3 border-b border-purple-500/15 flex items-center justify-between">
                      <h3 className="font-orbitron text-xs text-white tracking-widest uppercase">Community Posts ({posts.length})</h3>
                      <p className="font-rajdhani text-xs text-slate-600">Post, pin, flag, or remove</p>
                    </div>
                    <div className="flex flex-col gap-2 p-4 max-h-[600px] overflow-y-auto">
                      {posts.length===0?<p className="font-rajdhani text-slate-600 text-sm text-center py-6">No posts yet.</p>:
                      posts.map((p:any)=>(
                        <div key={p.id} className={`border p-4 flex flex-col gap-2 ${p.isPinned?'border-amber-500/30':'border-purple-500/10'} ${p.flagged?'opacity-50':''}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <span className="font-orbitron text-[10px] text-white">{p.isAnonymous?'[Anonymous]':p.author?.nickname||'Unknown'}</span>
                              <span className="font-rajdhani text-[10px] text-slate-600 ml-2">{new Date(p.createdAt).toLocaleDateString()}</span>
                              {p.isPinned&&<span className="font-orbitron text-[9px] text-amber-400 ml-2">📌 PINNED</span>}
                              {p.flagged&&<span className="font-orbitron text-[9px] text-red-400 ml-2">🚩 FLAGGED</span>}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={async()=>{
                                await fetch(`/api/posts/${p.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({isPinned:!p.isPinned})})
                                msg(p.isPinned?'Unpinned.':'Pinned.');loadAll()
                              }} className="font-orbitron text-[9px] px-2 py-1 border border-amber-500/30 text-amber-400 hover:bg-amber-900/10">
                                {p.isPinned?'UNPIN':'PIN'}
                              </button>
                              <button onClick={async()=>{
                                await fetch(`/api/posts/${p.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({flagged:!p.flagged})})
                                msg(p.flagged?'Unflagged.':'Flagged.');loadAll()
                              }} className="font-orbitron text-[9px] px-2 py-1 border border-red-500/30 text-red-400 hover:bg-red-900/10">
                                {p.flagged?'UNFLAG':'FLAG'}
                              </button>
                              <button onClick={async()=>{
                                if(!confirm('Delete this post?'))return
                                await fetch(`/api/posts/${p.id}`,{method:'DELETE'})
                                msg('Post deleted.');loadAll()
                              }} className="font-orbitron text-[9px] px-2 py-1 border border-slate-700 text-slate-500 hover:border-red-500/40 hover:text-red-400">
                                DEL
                              </button>
                            </div>
                          </div>
                          {p.title&&<p className="font-orbitron text-sm text-white">{p.title}</p>}
                          <p className="font-rajdhani text-slate-400 text-xs leading-relaxed">{p.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── AI ALERTS TAB ── */}
              {tab === 'AI Alerts' && (
                <div className="flex flex-col gap-5">
                  <div className="bg-[#0d0017] border border-red-500/20 p-6">
                    <h3 className="font-orbitron text-xs text-red-400 tracking-widest uppercase mb-5">System Alerts — Live Data</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { icon:'⚠', label:'Flagged Chat',     value: alerts.flaggedChat?.length || 0,     color:'text-yellow-400', border:'border-yellow-500/20' },
                        { icon:'✉', label:'Flagged DMs',      value: alerts.flaggedDMs?.length || 0,      color:'text-orange-400', border:'border-orange-500/20' },
                        { icon:'⛔', label:'Open Reports',     value: alerts.unresolvedReports?.length || 0, color:'text-red-400',    border:'border-red-500/20'    },
                        { icon:'◈', label:'Risky / Watched',  value: alerts.riskyUsers?.length || 0,      color:'text-purple-400', border:'border-purple-500/20' },
                      ].map(({icon,label,value,color,border}) => (
                        <div key={label} className={`border ${border} p-4`}>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-xl ${color}`}>{icon}</span>
                            <span className="font-orbitron text-xs text-white">{label}</span>
                          </div>
                          <div className={`font-orbitron font-black text-3xl ${color}`}>{value}</div>
                          <div className="font-rajdhani text-xs text-slate-600 mt-1">Live from Sentinel</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Unresolved reports */}
                  <div className="bg-[#0d0017] border border-amber-500/15 p-4">
                    <h4 className="font-orbitron text-xs text-amber-400 tracking-widest uppercase mb-3">Unresolved Reports</h4>
                    {(!alerts.unresolvedReports || alerts.unresolvedReports.length === 0) ? (
                      <p className="font-rajdhani text-sm text-slate-600">No open reports.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {alerts.unresolvedReports.map((r: any) => (
                          <div key={r.id} className="flex items-start justify-between gap-3 border border-amber-500/10 p-3">
                            <div>
                              <div className="font-rajdhani text-sm text-slate-300">
                                <span className="text-slate-500">{r.reportedBy?.nickname || r.reportedBy?.name || 'Unknown'}</span> reported{' '}
                                <span className="text-white">{r.reportedAbout?.nickname || r.reportedAbout?.name || 'Unknown'}</span>
                              </div>
                              <div className="font-rajdhani text-xs text-slate-500 mt-1">{r.reason}</div>
                              <div className="font-orbitron text-[9px] text-slate-600 mt-1">{new Date(r.createdAt).toLocaleString()}</div>
                            </div>
                            <button onClick={() => resolveReport(r.id)}
                              className="font-orbitron text-[9px] px-3 py-1.5 border border-green-500/40 text-green-400 hover:bg-green-900/20 transition-all whitespace-nowrap">
                              RESOLVE
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Risky / watched users */}
                  <div className="bg-[#0d0017] border border-purple-500/15 p-4">
                    <h4 className="font-orbitron text-xs text-purple-400 tracking-widest uppercase mb-3">Risky / Watched Users</h4>
                    {(!alerts.riskyUsers || alerts.riskyUsers.length === 0) ? (
                      <p className="font-rajdhani text-sm text-slate-600">No users currently flagged by the trust engine.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {alerts.riskyUsers.map((u: any) => (
                          <div key={u.id} className="flex items-center justify-between border border-purple-500/10 p-3">
                            <div className="font-rajdhani text-sm text-slate-300">{u.nickname || u.name} <span className="text-slate-600">({u.email})</span></div>
                            <div className="flex items-center gap-3">
                              <span className="font-orbitron text-[10px] text-slate-500">score {u.trustScore}</span>
                              <span className={`font-orbitron text-[9px] uppercase px-2 py-0.5 border ${u.trustLevel === 'RISK' ? 'text-red-400 border-red-500/30' : 'text-orange-400 border-orange-500/30'}`}>{u.trustLevel}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Flagged chat & DMs */}
                  <div className="grid lg:grid-cols-2 gap-5">
                    <div className="bg-[#0d0017] border border-yellow-500/15 p-4">
                      <h4 className="font-orbitron text-xs text-yellow-400 tracking-widest uppercase mb-3">Flagged Chat Messages</h4>
                      {(!alerts.flaggedChat || alerts.flaggedChat.length === 0) ? (
                        <p className="font-rajdhani text-sm text-slate-600">Nothing flagged in chat.</p>
                      ) : (
                        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                          {alerts.flaggedChat.map((m: any) => (
                            <div key={m.id} className="border border-yellow-500/10 p-2.5">
                              <div className="font-rajdhani text-xs text-slate-500">{m.user?.nickname || m.user?.name} · #{m.channel}</div>
                              <div className="font-rajdhani text-sm text-slate-300 mt-0.5">{m.content}</div>
                              {m.flagReason && <div className="font-orbitron text-[9px] text-yellow-500 mt-1">{m.flagReason}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="bg-[#0d0017] border border-orange-500/15 p-4">
                      <h4 className="font-orbitron text-xs text-orange-400 tracking-widest uppercase mb-3">Flagged Direct Messages</h4>
                      {(!alerts.flaggedDMs || alerts.flaggedDMs.length === 0) ? (
                        <p className="font-rajdhani text-sm text-slate-600">Nothing flagged in DMs.</p>
                      ) : (
                        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                          {alerts.flaggedDMs.map((m: any) => (
                            <div key={m.id} className="border border-orange-500/10 p-2.5">
                              <div className="font-rajdhani text-xs text-slate-500">
                                {m.from?.nickname || m.from?.name} → {m.to?.nickname || m.to?.name}
                              </div>
                              <div className="font-rajdhani text-sm text-slate-300 mt-0.5">{m.content}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── FEEDBACK TAB ── */}
              {tab === 'Feedback' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-orbitron text-xs text-white tracking-widest uppercase">
                      Member Feedback ({feedbacks.length})
                    </h3>
                    <div className="flex gap-2">
                      {[
                        { label:'Open', count: feedbacks.filter((f:any)=>f.status==='OPEN').length, color:'text-yellow-400' },
                        { label:'Replied', count: feedbacks.filter((f:any)=>f.status==='REPLIED').length, color:'text-green-400' },
                      ].map(({label,count,color}) => (
                        <span key={label} className={`font-orbitron text-[9px] ${color} border border-current/30 px-2 py-1`}>
                          {count} {label}
                        </span>
                      ))}
                    </div>
                  </div>
                  {feedbacks.length === 0 ? (
                    <div className="bg-[#0d0017] border border-purple-500/20 p-8 text-center">
                      <p className="font-rajdhani text-slate-600">No feedback submitted yet.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {feedbacks.map((fb:any) => (
                        <div key={fb.id} className={`bg-[#0d0017] border p-5 ${
                          fb.status === 'OPEN' ? 'border-yellow-500/25' :
                          fb.status === 'REPLIED' ? 'border-green-500/20' : 'border-purple-500/15'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-orbitron text-[9px] text-purple-400 tracking-widest">{fb.type}</span>
                              <span className={`font-orbitron text-[8px] border px-1.5 py-0.5 ${
                                fb.status === 'OPEN' ? 'text-yellow-400 border-yellow-500/30' :
                                fb.status === 'REPLIED' ? 'text-green-400 border-green-500/30' :
                                'text-slate-500 border-slate-700'
                              }`}>{fb.status}</span>
                              <span className="font-orbitron text-[9px] text-white">
                                {fb.user?.nickname || fb.user?.name || fb.email || 'Anonymous'}
                              </span>
                              {fb.user?.role && (
                                <span className="font-orbitron text-[8px] text-slate-600">{fb.user.role.replace(/_/g,' ')}</span>
                              )}
                            </div>
                            <span className="font-rajdhani text-[10px] text-slate-600 flex-shrink-0">
                              {new Date(fb.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <p className="font-rajdhani text-slate-300 text-sm leading-relaxed mb-3">{fb.content}</p>

                          {/* Existing replies */}
                          {fb.replies?.length > 0 && (
                            <div className="mb-3 space-y-2">
                              {fb.replies.map((r:any) => (
                                <div key={r.id} className="bg-purple-950/20 border border-purple-500/20 p-3">
                                  <div className="font-orbitron text-[8px] text-amber-400 mb-1">
                                    [Founder] {new Date(r.createdAt).toLocaleDateString()}
                                  </div>
                                  <p className="font-rajdhani text-slate-300 text-xs">{r.content}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Reply section */}
                          {fb.status !== 'CLOSED' && (
                            replyFbId === fb.id ? (
                              <div className="flex gap-2 mt-2">
                                <input
                                  value={replyContent}
                                  onChange={e=>setReplyContent(e.target.value)}
                                  placeholder="Your reply..."
                                  className="flex-1 bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2 focus:outline-none focus:border-amber-400/50"
                                />
                                <button onClick={()=>replyFeedback(fb.id)}
                                  className="font-orbitron text-[9px] px-3 py-2 border border-amber-500/40 text-amber-400 hover:bg-amber-900/20 transition-all flex-shrink-0">
                                  SEND
                                </button>
                                <button onClick={()=>{setReplyFbId('');setReplyContent('')}}
                                  className="font-orbitron text-[9px] px-2 py-2 border border-slate-700 text-slate-600 hover:text-slate-400 transition-all">
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button onClick={()=>setReplyFbId(fb.id)}
                                  className="font-orbitron text-[9px] px-2 py-1.5 border border-amber-500/30 text-amber-400 hover:bg-amber-900/10 transition-all">
                                  REPLY
                                </button>
                                <button onClick={()=>closeFeedback(fb.id)}
                                  className="font-orbitron text-[9px] px-2 py-1.5 border border-slate-700 text-slate-600 hover:text-slate-400 transition-all">
                                  CLOSE
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── FEATURE UNLOCK TAB ── */}
              {tab === 'Feature Unlock' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Unlock form */}
                  <div className="bg-[#0d0017] border border-amber-500/20 p-5">
                    <h3 className="font-orbitron text-xs text-amber-400 tracking-widest uppercase mb-4 pb-3 border-b border-amber-500/20">
                      Unlock Feature for User
                    </h3>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">User</label>
                        <select value={unlockUserId} onChange={e=>setUnlockUserId(e.target.value)}
                          className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5 focus:outline-none focus:border-purple-400/70 transition-all">
                          <option value="">-- Select user --</option>
                          {users.map((u:any) => (
                            <option key={u.id} value={u.id}>
                              {u.nickname || u.name} ({u.role.replace(/_/g,' ')})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Feature to Unlock</label>
                        <select value={unlockFeature} onChange={e=>setUnlockFeature(e.target.value)}
                          className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5 focus:outline-none focus:border-purple-400/70 transition-all">
                          <option value="">-- Select feature --</option>
                          {features.map((f:any) => (
                            <option key={f.key} value={f.key}>{f.label} — {f.desc}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="font-orbitron text-[9px] text-purple-300/70 tracking-widest uppercase block mb-1.5">Note (optional)</label>
                        <input value={unlockNote} onChange={e=>setUnlockNote(e.target.value)} placeholder="Reason for unlock..."
                          className="w-full bg-black/50 border border-purple-500/25 text-slate-200 text-sm font-rajdhani px-3 py-2.5 focus:outline-none focus:border-purple-400/70 transition-all" />
                      </div>
                      <GlowButton variant="primary" size="sm" loading={saving} onClick={unlockFeatureForUser}
                        disabled={!unlockUserId || !unlockFeature}>
                        Unlock Feature
                      </GlowButton>
                    </div>
                  </div>

                  {/* Active unlocks */}
                  <div className="bg-[#0d0017] border border-purple-500/20 p-5">
                    <h3 className="font-orbitron text-xs text-white tracking-widest uppercase mb-4 pb-3 border-b border-purple-500/15">
                      Active Unlocks ({unlocks.length})
                    </h3>
                    <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">
                      {unlocks.length === 0 ? (
                        <p className="font-rajdhani text-slate-600 text-sm text-center py-6">No feature unlocks active.</p>
                      ) : unlocks.map((u:any) => (
                        <div key={u.id} className="border border-purple-500/10 p-3 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-orbitron text-xs text-purple-400">{u.feature}</div>
                            <div className="font-rajdhani text-xs text-white mt-0.5">
                              {u.user?.nickname || u.user?.name} <span className="text-slate-600">({u.user?.email})</span>
                            </div>
                            {u.note && <div className="font-rajdhani text-[10px] text-slate-600 mt-0.5">{u.note}</div>}
                            <div className="font-rajdhani text-[10px] text-slate-700 mt-0.5">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <button onClick={()=>revokeUnlock(u.userId, u.feature)}
                            className="font-orbitron text-[8px] px-2 py-1 border border-red-500/30 text-red-400 hover:bg-red-900/20 transition-all flex-shrink-0">
                            REVOKE
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PAYOUTS TAB ── */}
              {tab === 'Payouts' && (
                <div className="flex flex-col gap-5">
                  <div className="bg-[#0d0017] border border-purple-500/20 p-6">
                    <h3 className="font-orbitron text-xs text-white tracking-widest uppercase mb-5">Payout Management</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { label:'Pending', value:`$${(payouts.totalPending || 0).toFixed(2)}`, sub: `${payouts.pendingCount || 0} quest(s)`, color:'text-yellow-400' },
                        { label:'Paid Out', value:`$${(payouts.totalPaid || 0).toFixed(2)}`, sub: `${payouts.paidCount || 0} quest(s)`, color:'text-green-400' },
                        { label:'Total Approved Value', value:`$${((payouts.totalPending || 0) + (payouts.totalPaid || 0)).toFixed(2)}`, sub: `${payouts.quests?.length || 0} quest(s)`, color:'text-purple-400' },
                      ].map(({label,value,sub,color}) => (
                        <div key={label} className="border border-purple-500/15 p-4 text-center">
                          <div className={`font-orbitron font-black text-2xl ${color}`}>{value}</div>
                          <div className="font-rajdhani text-xs text-slate-600 tracking-widest uppercase mt-1">{label}</div>
                          <div className="font-rajdhani text-[10px] text-slate-700 mt-0.5">{sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#0d0017] border border-purple-500/15 p-4">
                    <h4 className="font-orbitron text-xs text-purple-400 tracking-widest uppercase mb-3">Approved Quests With Cash Reward</h4>
                    {(!payouts.quests || payouts.quests.length === 0) ? (
                      <p className="font-rajdhani text-sm text-slate-600">No approved quests carry a cash reward yet.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {payouts.quests.map((q: any) => (
                          <div key={q.id} className="flex items-center justify-between gap-3 border border-purple-500/10 p-3">
                            <div className="min-w-0">
                              <div className="font-rajdhani text-sm text-slate-200 truncate">{q.title}</div>
                              <div className="font-orbitron text-[9px] text-slate-600 mt-0.5">
                                {q.claimedBy?.nickname || q.claimedBy?.name || 'Unclaimed'} · reviewed {q.reviewedAt ? new Date(q.reviewedAt).toLocaleDateString() : '—'}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="font-orbitron font-black text-amber-300">${(q.cashReward || 0).toFixed(2)}</span>
                              {q.payoutStatus === 'PAID' ? (
                                <button onClick={() => setPayoutStatus(q.id, 'PENDING')}
                                  className="font-orbitron text-[9px] px-3 py-1.5 border border-green-500/40 text-green-400 hover:bg-green-900/20 transition-all whitespace-nowrap">
                                  PAID ✓
                                </button>
                              ) : (
                                <button onClick={() => setPayoutStatus(q.id, 'PAID')}
                                  className="font-orbitron text-[9px] px-3 py-1.5 border border-amber-500/40 text-amber-300 hover:bg-amber-900/20 transition-all whitespace-nowrap">
                                  MARK PAID
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── SETTINGS TAB ── */}
              {tab === 'Settings' && (
                <div className="bg-[#0d0017] border border-purple-500/20 p-6">
                  <h3 className="font-orbitron text-xs text-white tracking-widest uppercase mb-5">Global Settings</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="border border-purple-500/15 p-4">
                      <h4 className="font-orbitron text-xs text-purple-400 tracking-widest mb-3">Commission Rates</h4>
                      {[['F','40%'],['E','35%'],['D','30%'],['C','25%'],['B','20%'],['A','15%'],['S','10%'],['SS','5%'],['SSS','2%']].map(([rank,cut]) => (
                        <div key={rank} className="flex justify-between py-1.5 border-b border-purple-500/5 last:border-0">
                          <span className={`font-orbitron text-xs ${RANK_COLORS[rank] || 'text-slate-400'}`}>{rank}</span>
                          <span className="font-rajdhani text-sm text-slate-400">{cut} Founder cut</span>
                        </div>
                      ))}
                    </div>
                    <div className="border border-purple-500/15 p-4">
                      <h4 className="font-orbitron text-xs text-purple-400 tracking-widest mb-3">Access Rules</h4>
                      {[
                        ['Quest Board','Accepted Member+'],
                        ['Messages','Rank D+'],
                        ['Guild Chat','Accepted Member+'],
                        ['Fun Arena','Accepted Member+'],
                        ['Elite Channel','Rank A+'],
                        ['Admin Panel','Admin Role+'],
                        ['Founder Panel','Founder Only'],
                      ].map(([page,req]) => (
                        <div key={page} className="flex justify-between py-1.5 border-b border-purple-500/5 last:border-0">
                          <span className="font-rajdhani text-sm text-slate-400">{page}</span>
                          <span className="font-orbitron text-[10px] text-purple-400/70">{req}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}

function TrialCard({ trial, onReview }: { trial: any; onReview: any }) {
  const [score, setScore] = useState('')
  const [notes, setNotes] = useState('')
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-purple-500/15 p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-orbitron text-xs text-white">{trial.user?.nickname || trial.user?.name || 'Unknown'}</div>
          <div className="font-rajdhani text-xs text-slate-500 mt-0.5">{trial.user?.email}</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {trial.skills?.map((s:string) => (
              <span key={s} className="font-orbitron text-[9px] border border-purple-500/20 text-purple-400/70 px-1.5 py-0.5">{s}</span>
            ))}
          </div>
          <div className="font-rajdhani text-xs text-slate-500 mt-1">Availability: {trial.availability}</div>
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <span className={`font-orbitron text-[10px] px-2 py-1 border text-center ${
            trial.status==='PENDING' ? 'text-yellow-400 border-yellow-500/30' :
            trial.status==='UNDER_REVIEW' ? 'text-blue-400 border-blue-500/30' :
            trial.status==='ACCEPTED' ? 'text-green-400 border-green-500/30' :
            'text-red-400 border-red-500/30'
          }`}>{trial.status.replace('_',' ')}</span>
          <button onClick={()=>setOpen(!open)}
            className="font-orbitron text-[9px] px-2 py-1 border border-amber-500/30 text-amber-400 hover:bg-amber-900/10 transition-all">
            {open?'CLOSE':'REVIEW'}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 pt-4 border-t border-purple-500/10 flex flex-col gap-3">
          <div className="font-rajdhani text-xs text-slate-400">
            <span className="font-orbitron text-[9px] text-purple-400 mr-2">WHY JOIN:</span>
            {trial.whyJoin}
          </div>
          <div className="font-rajdhani text-xs text-slate-400">
            <span className="font-orbitron text-[9px] text-purple-400 mr-2">STRENGTHS:</span>
            {trial.strengths}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-orbitron text-[9px] text-slate-600 tracking-widest uppercase block mb-1">Score (0-100)</label>
              <input type="number" min="0" max="100" value={score} onChange={e=>setScore(e.target.value)} placeholder="75"
                className="w-full bg-black/40 border border-purple-500/20 text-slate-200 text-sm font-rajdhani px-3 py-2 focus:outline-none focus:border-purple-400/50 transition-all" />
            </div>
            <div>
              <label className="font-orbitron text-[9px] text-slate-600 tracking-widest uppercase block mb-1">Notes</label>
              <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Founder notes..."
                className="w-full bg-black/40 border border-purple-500/20 text-slate-200 text-sm font-rajdhani px-3 py-2 focus:outline-none focus:border-purple-400/50 transition-all" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>onReview(trial.id,'ACCEPTED',score?parseInt(score):undefined,notes||undefined)}
              className="font-orbitron text-[10px] px-3 py-2 border border-green-500/40 text-green-400 hover:bg-green-900/20 transition-all">
              ACCEPT
            </button>
            <button onClick={()=>onReview(trial.id,'UNDER_REVIEW',score?parseInt(score):undefined,notes||undefined)}
              className="font-orbitron text-[10px] px-3 py-2 border border-blue-500/40 text-blue-400 hover:bg-blue-900/20 transition-all">
              MARK REVIEWING
            </button>
            <button onClick={()=>onReview(trial.id,'REJECTED',score?parseInt(score):undefined,notes||undefined)}
              className="font-orbitron text-[10px] px-3 py-2 border border-red-500/40 text-red-400 hover:bg-red-900/20 transition-all">
              REJECT
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const redirect = await requireAuth(context, 'FOUNDER')
  if (redirect) return redirect
  return { props: {} }
}