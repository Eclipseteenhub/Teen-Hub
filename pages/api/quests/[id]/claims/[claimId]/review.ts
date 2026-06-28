import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { reviewSubmission } from '@/lib/ai'
import { awardXP } from '@/lib/xp'
import { applyTrustEvent, applyRawTrustDelta } from '@/lib/trustEngine'
import { awardEligibleAchievements } from '@/lib/achievements'
import { notify } from '@/lib/notify'

const ROLE_LEVEL: Record<string, number> = {
  GUEST:0,TRIAL_MEMBER:1,ACCEPTED_MEMBER:2,ACTIVE_WORKER:3,
  MODERATOR:4,COORDINATOR:5,ADMIN:6,FOUNDER:7,
}
const ACTIVE_CLAIM_STATUSES = ['CLAIMED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || ROLE_LEVEL[session.user.role] < ROLE_LEVEL['MODERATOR']) {
    return res.status(403).json({ error: 'Reviewer access required' })
  }

  const { id: questId, claimId } = req.query as { id: string; claimId: string }
  const claim = await prisma.questClaim.findUnique({ where: { id: claimId }, include: { quest: true } })
  if (!claim || claim.questId !== questId) return res.status(404).json({ error: 'Claim not found' })

  // GET = AI pre-screen for the human reviewer. Advisory only — it does not decide.
  if (req.method === 'GET') {
    if (claim.status !== 'SUBMITTED') return res.status(400).json({ error: 'This claim has not been submitted yet' })
    const aiReview = await reviewSubmission({
      questTitle: claim.quest.title,
      instructions: claim.quest.instructions,
      submissionNote: claim.submissionNote || '',
      submissionUrl: claim.submissionUrl || undefined,
    })
    return res.json({ aiReview })
  }

  if (req.method !== 'POST') return res.status(405).end()
  if (claim.status !== 'SUBMITTED') return res.status(400).json({ error: 'This claim has not been submitted yet' })

  const { decision, reviewNote, clientRating, clientFeedback } = req.body as {
    decision: 'APPROVE' | 'REJECT'
    reviewNote?: string
    clientRating?: number
    clientFeedback?: string
  }
  if (!['APPROVE', 'REJECT'].includes(decision)) return res.status(400).json({ error: 'decision must be APPROVE or REJECT' })

  const rating = clientRating != null ? Math.max(1, Math.min(5, Math.round(clientRating))) : null
  const userId = claim.userId
  const quest = claim.quest

  if (decision === 'APPROVE') {
    await prisma.questClaim.update({
      where: { id: claim.id },
      data: {
        status: 'APPROVED', reviewedAt: new Date(), reviewNote: reviewNote || null,
        payoutStatus: quest.cashReward ? 'PENDING' : 'NOT_APPLICABLE',
        clientRating: rating, clientFeedback: clientFeedback || null,
      },
    })
    await awardXP(userId, quest.rewardXp, `Quest approved: ${quest.title}`)
    await applyTrustEvent(userId, 'QUEST_APPROVED', `Quest approved: ${quest.title}`, session.user.role)

    if (rating != null) {
      const ratingDelta = (rating - 3) * 4 // 5★=+8, 4★=+4, 3★=0, 2★=-4, 1★=-8
      await applyRawTrustDelta(userId, ratingDelta, `Client rated submission ${rating}/5: ${quest.title}`, session.user.role, 'CLIENT_RATING')
    }

    await awardEligibleAchievements(userId)
    await prisma.activityLog.create({
      data: { userId, action: 'QUEST_APPROVED', details: `"${quest.title}" approved by ${session.user.name || session.user.role}` },
    })
    await notify(
      userId,
      'QUEST_APPROVED',
      `Quest approved: ${quest.title}`,
      rating != null ? `Client rated your work ${rating}/5${clientFeedback ? ` — "${clientFeedback}"` : ''}.` : `+${quest.rewardXp} XP awarded.`,
      `/dashboard/quest/${quest.id}`
    )
  } else {
    await prisma.questClaim.update({
      where: { id: claim.id },
      data: { status: 'REJECTED', reviewedAt: new Date(), reviewNote: reviewNote || null },
    })
    await applyTrustEvent(userId, 'QUEST_ABANDONED', reviewNote || `Submission rejected: ${quest.title}`, session.user.role)
    await prisma.activityLog.create({
      data: { userId, action: 'QUEST_REJECTED', details: `"${quest.title}" rejected for one participant` },
    })
    await notify(
      userId,
      'QUEST_REJECTED',
      `Submission rejected: ${quest.title}`,
      reviewNote || 'Your submission did not meet the requirements.',
      '/dashboard/quests'
    )
  }

  // A rejection frees a slot — if the quest was FULL, it can reopen to the board.
  if (decision === 'REJECT' && quest.status === 'FULL') {
    const remainingActive = await prisma.questClaim.count({
      where: { questId, status: { in: ACTIVE_CLAIM_STATUSES } },
    })
    if (remainingActive < quest.maxParticipants) {
      await prisma.quest.update({ where: { id: questId }, data: { status: 'OPEN' } })
    }
  }

  const updated = await prisma.questClaim.findUnique({ where: { id: claim.id } })
  res.json({ claim: updated })
}