import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { GetServerSideProps } from 'next'
import { getAuthSession, requireAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import GlowButton from '@/components/ui/GlowButton'
import GlowTextarea from '@/components/ui/GlowTextarea'
import GlowInput from '@/components/ui/GlowInput'

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy:   'text-green-400 border-green-500/40',
  Medium: 'text-yellow-400 border-yellow-500/40',
  Hard:   'text-orange-400 border-orange-500/40',
  Expert: 'text-red-400 border-red-500/40',
}

export default function QuestDetailPage({ quest, myClaim, slotsFilled, slotsTotal }: { quest: any; myClaim: any; slotsFilled: number; slotsTotal: number }) {
  const router = useRouter()
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submissionUrl, setSubmissionUrl] = useState('')
  const [submissionNote, setSubmissionNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleClaim() {
    setClaiming(true)
    setError('')
    const res = await fetch(`/api/quests/${quest.id}/claim`, { method: 'POST' })
    const data = await res.json()
    setClaiming(false)
    if (!res.ok) setError(data.error || 'Failed to claim quest')
    else { setSuccess('Quest claimed. Report for duty.'); setTimeout(() => router.push('/dashboard/quests'), 1500) }
  }

  async function handleSubmit() {
    if (!submissionNote.trim()) { setError('Describe what you completed before submitting.'); return }
    setSubmitting(true)
    setError('')
    const res = await fetch(`/api/quests/${quest.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionUrl: submissionUrl.trim() || undefined, submissionNote: submissionNote.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    setSubmitting(false)
    if (!res.ok) { setError(data.error || 'Failed to submit'); return }
    setSuccess('Submitted for review. The Founder will review your work soon.')
    setTimeout(() => router.reload(), 1200)
  }

  const slotsAvailable = quest.status === 'OPEN' && slotsFilled < slotsTotal
  const canClaim = slotsAvailable && !myClaim
  const canSubmit = myClaim && ['CLAIMED', 'IN_PROGRESS'].includes(myClaim.status)
  const isSubmitted = myClaim?.status === 'SUBMITTED'
  const isApproved = myClaim?.status === 'APPROVED'
  const isRejected = myClaim?.status === 'REJECTED'

  return (
    <>
      <Head><title>{quest.title} — QuestHub Guild</title></Head>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto flex flex-col gap-6">

          <div className="flex items-center gap-3">
            <Link href="/dashboard/quests" className="font-rajdhani text-slate-600 hover:text-purple-400 text-sm transition-colors">
              ← Quest Board
            </Link>
          </div>

          <div className="relative bg-[#0d0017] border border-purple-500/20 p-6 sm:p-8 overflow-hidden">
            <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-purple-500/50" />
            <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-purple-500/50" />

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
              {slotsTotal > 1 && (
                <span className="font-orbitron text-[9px] border border-blue-500/30 text-blue-400 px-2 py-0.5 tracking-widest">
                  {slotsFilled}/{slotsTotal} SLOTS FILLED
                </span>
              )}
              <span className={`font-orbitron text-[9px] px-2 py-0.5 tracking-widest border ${
                myClaim ? (
                  myClaim.status === 'APPROVED' ? 'text-green-400 border-green-500/40' :
                  myClaim.status === 'REJECTED' ? 'text-red-400 border-red-500/40' :
                  myClaim.status === 'SUBMITTED' ? 'text-purple-400 border-purple-500/40' :
                  'text-yellow-400 border-yellow-500/40'
                ) : quest.status === 'OPEN' ? 'text-green-400 border-green-500/40' : 'text-slate-500 border-slate-700'
              }`}>
                {myClaim ? myClaim.status.replace('_', ' ') : quest.status}
              </span>
            </div>

            <h1 className="font-orbitron font-black text-xl sm:text-2xl text-white mb-4 leading-tight">{quest.title}</h1>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 p-4 bg-black/30 border border-purple-500/10">
              <div>
                <div className="font-orbitron text-[9px] text-slate-600 tracking-widest uppercase">XP Reward</div>
                <div className="font-orbitron font-black text-lg text-purple-400 mt-1">+{quest.rewardXp}</div>
              </div>
              {quest.cashReward != null && (
                <div>
                  <div className="font-orbitron text-[9px] text-slate-600 tracking-widest uppercase">Cash Reward</div>
                  <div className="font-orbitron font-black text-lg text-amber-300 mt-1">${quest.cashReward.toFixed(2)}</div>
                </div>
              )}
              {quest.deadline && (
                <div>
                  <div className="font-orbitron text-[9px] text-slate-600 tracking-widest uppercase">Deadline</div>
                  <div className="font-rajdhani text-slate-300 text-sm mt-1">
                    {new Date(quest.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              )}
              <div>
                <div className="font-orbitron text-[9px] text-slate-600 tracking-widest uppercase">Client</div>
                <div className="font-rajdhani text-slate-500 text-sm mt-1">— Hidden —</div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-orbitron text-xs text-purple-400 tracking-widest uppercase mb-3">Mission Briefing</h3>
              <div className="font-rajdhani text-slate-300 leading-relaxed whitespace-pre-wrap">{quest.instructions}</div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/40 px-4 py-3 text-red-300 text-sm font-rajdhani mb-4">
                ⚠ {error}
              </div>
            )}
            {success && (
              <div className="bg-green-900/20 border border-green-500/40 px-4 py-3 text-green-300 text-sm font-rajdhani mb-4">
                ✓ {success}
              </div>
            )}

            {/* ── Submission form ── */}
            {canSubmit && (
              <div className="mb-6 p-4 border border-blue-500/20 bg-blue-950/10">
                <h3 className="font-orbitron text-xs text-blue-400 tracking-widest uppercase mb-3">Submit Your Results</h3>
                <div className="flex flex-col gap-3">
                  <GlowInput label="Link to your work (optional)" placeholder="https://..." value={submissionUrl} onChange={(e: any) => setSubmissionUrl(e.target.value)} />
                  <GlowTextarea label="What did you complete? *" placeholder="Describe what you did, any notes for the reviewer..." rows={4} value={submissionNote} onChange={(e: any) => setSubmissionNote(e.target.value)} />
                  <GlowButton variant="primary" size="md" loading={submitting} onClick={handleSubmit}>
                    Submit for Review
                  </GlowButton>
                </div>
              </div>
            )}

            {isSubmitted && (
              <div className="mb-6 p-4 border border-purple-500/20 bg-purple-950/10">
                <h3 className="font-orbitron text-xs text-purple-400 tracking-widest uppercase mb-2">Awaiting Review</h3>
                <p className="font-rajdhani text-sm text-slate-400">
                  Your submission was sent on {myClaim.submittedAt ? new Date(myClaim.submittedAt).toLocaleString() : 'recently'}. You'll be notified once it's reviewed.
                </p>
                {myClaim.submissionNote && (
                  <p className="font-rajdhani text-sm text-slate-500 mt-2 italic">"{myClaim.submissionNote}"</p>
                )}
              </div>
            )}

            {isApproved && (
              <div className="mb-6 p-4 border border-green-500/20 bg-green-950/10">
                <h3 className="font-orbitron text-xs text-green-400 tracking-widest uppercase mb-2">Approved ✓</h3>
                <p className="font-rajdhani text-sm text-slate-400">+{quest.rewardXp} XP awarded.</p>
                {myClaim.clientRating != null && (
                  <div className="flex items-center gap-1 mt-2">
                    {[1,2,3,4,5].map(n => (
                      <span key={n} className={n <= myClaim.clientRating ? 'text-amber-400' : 'text-slate-700'}>★</span>
                    ))}
                    <span className="font-rajdhani text-xs text-slate-500 ml-1">Client rating</span>
                  </div>
                )}
                {myClaim.clientFeedback && (
                  <p className="font-rajdhani text-sm text-slate-400 mt-2 italic">"{myClaim.clientFeedback}"</p>
                )}
                {myClaim.reviewNote && (
                  <p className="font-rajdhani text-sm text-slate-500 mt-2">{myClaim.reviewNote}</p>
                )}
              </div>
            )}

            {isRejected && (
              <div className="mb-6 p-4 border border-red-500/20 bg-red-950/10">
                <h3 className="font-orbitron text-xs text-red-400 tracking-widest uppercase mb-2">Not Approved</h3>
                {myClaim.reviewNote && <p className="font-rajdhani text-sm text-slate-400 mt-1">{myClaim.reviewNote}</p>}
                <p className="font-rajdhani text-xs text-slate-600 mt-2">Other slots on this quest may still be open if you'd like to try again.</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-purple-500/10">
              {canClaim && (
                <GlowButton variant="primary" size="md" loading={claiming} onClick={handleClaim}>
                  Apply for Quest
                </GlowButton>
              )}
              {!slotsAvailable && !myClaim && quest.status !== 'CLOSED' && (
                <p className="font-rajdhani text-sm text-slate-500">All slots for this quest are currently filled.</p>
              )}
              <GlowButton variant="ghost" size="md" onClick={() => router.back()}>
                Back
              </GlowButton>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const redirect = await requireAuth(context, 'ACCEPTED_MEMBER')
  if (redirect) return redirect

  const session = await getAuthSession(context)
  const { id } = context.params as { id: string }
  const quest = await prisma.quest.findUnique({ where: { id } })
  if (!quest) return { notFound: true }

  const ACTIVE = ['CLAIMED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED']
  const [myClaim, slotsFilled] = await Promise.all([
    session?.user ? prisma.questClaim.findUnique({ where: { questId_userId: { questId: id, userId: session.user.id } } }) : null,
    prisma.questClaim.count({ where: { questId: id, status: { in: ACTIVE } } }),
  ])

  return {
    props: {
      quest: JSON.parse(JSON.stringify(quest)),
      myClaim: myClaim ? JSON.parse(JSON.stringify(myClaim)) : null,
      slotsFilled,
      slotsTotal: quest.maxParticipants,
    },
  }
}