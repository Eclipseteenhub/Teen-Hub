import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      trial: true,
      xpLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
      activityLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      questClaims: {
        where: { status: { in: ['CLAIMED', 'IN_PROGRESS', 'SUBMITTED'] } },
        orderBy: { claimedAt: 'desc' },
        take: 5,
        include: { quest: { select: { id: true, title: true, rewardXp: true, cashReward: true } } },
      },
      warnings: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })

  if (!user) return res.status(404).json({ error: 'User not found' })

  // Never send password
  const { passwordHash, ...safeUser } = user
  return res.status(200).json(safeUser)
}