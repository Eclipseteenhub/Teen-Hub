import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || session.user.role !== 'FOUNDER') return res.status(403).json({ error: 'Forbidden' })

  if (req.method === 'GET') {
    const quests = await prisma.quest.findMany({
      where: { status: 'APPROVED', cashReward: { not: null } },
      orderBy: { reviewedAt: 'desc' },
      include: { claimedBy: { select: { id: true, nickname: true, name: true, email: true } } },
    })

    const pending = quests.filter(q => q.payoutStatus === 'PENDING')
    const paid = quests.filter(q => q.payoutStatus === 'PAID')

    const totalPending = pending.reduce((sum, q) => sum + (q.cashReward || 0), 0)
    const totalPaid = paid.reduce((sum, q) => sum + (q.cashReward || 0), 0)

    return res.json({
      quests,
      totalPending,
      totalPaid,
      pendingCount: pending.length,
      paidCount: paid.length,
    })
  }

  if (req.method === 'PATCH') {
    const { id, status } = req.body as { id: string; status: 'PENDING' | 'PAID' }
    if (!id || !['PENDING', 'PAID'].includes(status)) {
      return res.status(400).json({ error: 'id and a valid status are required' })
    }
    const quest = await prisma.quest.update({
      where: { id },
      data: { payoutStatus: status, paidAt: status === 'PAID' ? new Date() : null },
    })
    return res.json({ quest })
  }

  res.status(405).end()
}