import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notify } from '@/lib/notify'

const ROLE_LEVEL: Record<string, number> = {
  GUEST: 0, TRIAL_MEMBER: 1, ACCEPTED_MEMBER: 2, ACTIVE_WORKER: 3,
  MODERATOR: 4, COORDINATOR: 5, ADMIN: 6, FOUNDER: 7,
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    // Founders see everyone's suggestions; members see only their own.
    const where = session.user.role === 'FOUNDER' ? {} : { suggestedById: session.user.id }
    const suggestions = await prisma.questSuggestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { suggestedBy: { select: { id: true, nickname: true, name: true } } },
    })
    return res.json({ suggestions })
  }

  if (req.method === 'POST') {
    if (ROLE_LEVEL[session.user.role] < ROLE_LEVEL['ACCEPTED_MEMBER']) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const { title, category, difficulty, rankRequired, rewardXp, cashReward, instructions, deadline, maxParticipants } = req.body
    if (!title || !instructions) return res.status(400).json({ error: 'Title and instructions required' })

    let parsedDeadline: Date | null = null
    if (deadline && typeof deadline === 'string' && !['null', 'n/a', 'none', 'tbd', ''].includes(deadline.trim().toLowerCase())) {
      const d = new Date(deadline)
      if (!isNaN(d.getTime())) parsedDeadline = d
    }

    try {
      const suggestion = await prisma.questSuggestion.create({
        data: {
          suggestedById: session.user.id,
          title,
          category: category || 'General',
          difficulty: difficulty || 'Medium',
          rankRequired: rankRequired || 'F',
          rewardXp: parseInt(rewardXp) || 100,
          cashReward: cashReward ? parseFloat(cashReward) : null,
          instructions,
          deadline: parsedDeadline,
          maxParticipants: Math.max(1, parseInt(maxParticipants) || 1),
        },
      })

      // Notify every Founder — there may be more than one. Each notification
      // links straight into a DM thread with the person who suggested it.
      const founders = await prisma.user.findMany({ where: { role: 'FOUNDER' }, select: { id: true } })
      await Promise.all(founders.map(f => notify(
        f.id,
        'QUEST_SUGGESTED',
        `New quest suggestion: ${suggestion.title}`,
        `${session.user.name || session.user.role} suggested a quest. Open the chat to discuss terms.`,
        `/dashboard/messages?with=${session.user.id}&name=${encodeURIComponent(session.user.name || 'Member')}`
      )))

      return res.json({ suggestion })
    } catch (err: any) {
      console.error('[quest suggestion error]', err?.message || err)
      return res.status(500).json({ error: err?.message || 'Failed to create suggestion' })
    }
  }

  res.status(405).end()
}