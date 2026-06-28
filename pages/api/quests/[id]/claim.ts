import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const RANK_LEVEL: Record<string, number> = { F:0,E:1,D:2,C:3,B:4,A:5,S:6,SS:7,SSS:8 }
const ACTIVE_CLAIM_STATUSES = ['CLAIMED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query as { id: string }
  const quest = await prisma.quest.findUnique({ where: { id }, include: { claims: true } })
  if (!quest) return res.status(404).json({ error: 'Quest not found' })
  if (quest.status === 'CLOSED') return res.status(400).json({ error: 'This quest is closed' })

  const activeClaims = quest.claims.filter(c => ACTIVE_CLAIM_STATUSES.includes(c.status))
  if (activeClaims.length >= quest.maxParticipants) {
    return res.status(400).json({ error: 'All slots for this quest are filled' })
  }
  if (quest.claims.some(c => c.userId === session.user.id && ACTIVE_CLAIM_STATUSES.includes(c.status))) {
    return res.status(400).json({ error: 'You already have an active claim on this quest' })
  }

  const userRank = session.user.rank as string
  if (RANK_LEVEL[userRank] < RANK_LEVEL[quest.rankRequired]) {
    return res.status(403).json({ error: `This quest requires Rank ${quest.rankRequired} or higher` })
  }

  const claim = await prisma.questClaim.upsert({
    where: { questId_userId: { questId: id, userId: session.user.id } },
    update: { status: 'CLAIMED', claimedAt: new Date(), submittedAt: null, reviewedAt: null },
    create: { questId: id, userId: session.user.id, status: 'CLAIMED' },
  })

  // Slots full after this claim → take the listing off the open board.
  const newActiveCount = activeClaims.length + 1
  if (newActiveCount >= quest.maxParticipants) {
    await prisma.quest.update({ where: { id }, data: { status: 'FULL' } })
  }

  await prisma.activityLog.create({
    data: { userId: session.user.id, action: 'QUEST_CLAIMED', details: `Claimed quest: ${quest.title}` },
  })

  res.json({ claim })
}