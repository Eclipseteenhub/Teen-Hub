import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzeTrustRisk } from '@/lib/ai'

const ROLE_LEVEL: Record<string, number> = {
  GUEST:0,TRIAL_MEMBER:1,ACCEPTED_MEMBER:2,ACTIVE_WORKER:3,
  MODERATOR:4,COORDINATOR:5,ADMIN:6,FOUNDER:7,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session || ROLE_LEVEL[session.user.role] < ROLE_LEVEL['ADMIN']) {
    return res.status(403).json({ error: 'Admins only' })
  }

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { trustScore: true, rank: true, createdAt: true },
  })
  if (!user) return res.status(404).json({ error: 'User not found' })

  const [quests, flags, warnings] = await Promise.all([
    prisma.questClaim.findMany({ where: { userId }, select: { status: true } }),
    prisma.chatMessage.count({ where: { userId, flagged: true } }),
    prisma.warning.count({ where: { userId } }),
  ])

  const daysActive = Math.floor((Date.now() - user.createdAt.getTime()) / 86400000)

  const result = await analyzeTrustRisk({
    trustScore: user.trustScore,
    rank: user.rank,
    recentFlags: flags,
    questsCompleted: quests.filter(q => q.status === 'APPROVED').length,
    questsAbandoned: quests.filter(q => q.status === 'REJECTED').length,
    warningsCount: warnings,
    daysActive,
  })

  return res.json(result)
}