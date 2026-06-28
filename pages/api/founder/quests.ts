import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || session.user.role !== 'FOUNDER') return res.status(403).json({ error: 'Forbidden' })

  if (req.method === 'GET') {
    const quests = await prisma.quest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        claims: { include: { user: { select: { id: true, nickname: true, name: true } } } },
      },
    })
    return res.json({ quests })
  }

  if (req.method === 'POST') {
    const { title, category, difficulty, rankRequired, rewardXp, cashReward, instructions, deadline, maxParticipants } = req.body
    if (!title || !instructions) return res.status(400).json({ error: 'Title and instructions required' })

    let parsedDeadline: Date | null = null
    if (deadline && typeof deadline === 'string' && !['null', 'n/a', 'none', 'tbd', ''].includes(deadline.trim().toLowerCase())) {
      const d = new Date(deadline)
      if (!isNaN(d.getTime())) parsedDeadline = d
    }

    const slots = Math.max(1, parseInt(maxParticipants) || 1)

    try {
      const quest = await prisma.quest.create({
        data: {
          title,
          category: category || 'General',
          difficulty: difficulty || 'Medium',
          rankRequired: rankRequired || 'F',
          rewardXp: parseInt(rewardXp) || 100,
          cashReward: cashReward ? parseFloat(cashReward) : null,
          instructions,
          deadline: parsedDeadline,
          maxParticipants: slots,
          status: 'OPEN',
        },
      })
      return res.json({ quest })
    } catch (err: any) {
      console.error('[quest create error]', err?.message || err)
      return res.status(500).json({ error: err?.message || 'Failed to create quest' })
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    await prisma.quest.delete({ where: { id } })
    return res.json({ ok: true })
  }

  res.status(405).end()
}