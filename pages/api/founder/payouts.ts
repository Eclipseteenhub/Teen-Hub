import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || session.user.role !== 'FOUNDER') return res.status(403).json({ error: 'Forbidden' })

  if (req.method === 'GET') {
    const claims = await prisma.questClaim.findMany({
      where: { status: 'APPROVED', quest: { cashReward: { not: null } } },
      orderBy: { reviewedAt: 'desc' },
      include: {
        user: { select: { id: true, nickname: true, name: true, email: true } },
        quest: { select: { id: true, title: true, cashReward: true } },
      },
    })

    const pending = claims.filter(c => c.payoutStatus === 'PENDING')
    const paid = claims.filter(c => c.payoutStatus === 'PAID')

    const totalPending = pending.reduce((sum, c) => sum + (c.quest.cashReward || 0), 0)
    const totalPaid = paid.reduce((sum, c) => sum + (c.quest.cashReward || 0), 0)

    return res.json({
      claims,
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
    const claim = await prisma.questClaim.update({
      where: { id },
      data: { payoutStatus: status, paidAt: status === 'PAID' ? new Date() : null },
    })
    return res.json({ claim })
  }

  res.status(405).end()
}