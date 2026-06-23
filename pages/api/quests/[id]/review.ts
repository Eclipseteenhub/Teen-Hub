import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { reviewSubmission } from '@/lib/ai'
import { awardXP } from '@/lib/xp'
import { applyTrustEvent } from '@/lib/trustEngine'
import { awardEligibleAchievements } from '@/lib/achievements'

const ROLE_LEVEL: Record<string, number> = {
  GUEST:0,TRIAL_MEMBER:1,ACCEPTED_MEMBER:2,ACTIVE_WORKER:3,
  MODERATOR:4,COORDINATOR:5,ADMIN:6,FOUNDER:7,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || ROLE_LEVEL[session.user.role] < ROLE_LEVEL['MODERATOR']) {
    return res.status(403).json({ error: 'Reviewer access required' })
  }

  const { id } = req.query as { id: string }
  const quest = await prisma.quest.findUnique({ where: { id } })
  if (!quest) return res.status(404).json({ error: 'Quest not found' })

  // GET = AI pre-screen for the human reviewer. Advisory only — it does not decide.
  if (req.method === 'GET') {
    if (quest.status !== 'SUBMITTED') return res.status(400).json({ error: 'Quest has not been submitted yet' })
    const aiReview = await reviewSubmission({
      questTitle: quest.title,
      instructions: quest.instructions,
      submissionNote: quest.submissionNote || '',
      submissionUrl: quest.submissionUrl || undefined,
    })
    return res.json({ aiReview })
  }

  if (req.method !== 'POST') return res.status(405).end()
  if (quest.status !== 'SUBMITTED') return res.status(400).json({ error: 'Quest has not been submitted yet' })
  if (!quest.claimedById) return res.status(400).json({ error: 'Quest has no claimant' })

  const { decision, reviewNote } = req.body as { decision: 'APPROVE' | 'REJECT'; reviewNote?: string }
  if (!['APPROVE', 'REJECT'].includes(decision)) return res.status(400).json({ error: 'decision must be APPROVE or REJECT' })

  const userId = quest.claimedById

  if (decision === 'APPROVE') {
    await prisma.quest.update({
      where: { id },
      data: {
        status: 'APPROVED', reviewedAt: new Date(), reviewNote: reviewNote || null,
        payoutStatus: quest.cashReward ? 'PENDING' : 'NOT_APPLICABLE',
      },
    })
    await awardXP(userId, quest.rewardXp, `Quest approved: ${quest.title}`)
    await applyTrustEvent(userId, 'QUEST_APPROVED', `Quest approved: ${quest.title}`, session.user.role)
    await awardEligibleAchievements(userId)
    await prisma.activityLog.create({
      data: { userId, action: 'QUEST_APPROVED', details: `"${quest.title}" approved by ${session.user.name || session.user.role}` },
    })
  } else {
    // Rejected work reopens the quest to the board rather than dead-ending it.
    await prisma.quest.update({
      where: { id },
      data: {
        status: 'OPEN', claimedById: null, claimedAt: null,
        submittedAt: null, submissionUrl: null, submissionNote: null,
        reviewedAt: new Date(), reviewNote: reviewNote || null,
      },
    })
    await applyTrustEvent(userId, 'QUEST_ABANDONED', reviewNote || `Submission rejected: ${quest.title}`, session.user.role)
    await prisma.activityLog.create({
      data: { userId, action: 'QUEST_REJECTED', details: `"${quest.title}" rejected — reopened to board` },
    })
  }

  const updated = await prisma.quest.findUnique({ where: { id } })
  res.json({ quest: updated })
}