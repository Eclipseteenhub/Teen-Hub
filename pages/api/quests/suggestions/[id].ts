import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notify } from '@/lib/notify'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || session.user.role !== 'FOUNDER') return res.status(403).json({ error: 'Forbidden' })
  if (req.method !== 'PATCH') return res.status(405).end()

  const { id } = req.query as { id: string }
  const suggestion = await prisma.questSuggestion.findUnique({ where: { id } })
  if (!suggestion) return res.status(404).json({ error: 'Suggestion not found' })

  const { action, founderNote, overrides } = req.body as {
    action: 'approve' | 'decline' | 'mark_discussing'
    founderNote?: string
    overrides?: Partial<{
      title: string; category: string; difficulty: string; rankRequired: string
      rewardXp: number; cashReward: number | null; instructions: string
      deadline: string | null; maxParticipants: number
    }>
  }

  if (action === 'mark_discussing') {
    await prisma.questSuggestion.update({ where: { id }, data: { status: 'DISCUSSING' } })
    return res.json({ ok: true })
  }

  if (action === 'decline') {
    await prisma.questSuggestion.update({
      where: { id }, data: { status: 'DECLINED', founderNote: founderNote || null },
    })
    await notify(
      suggestion.suggestedById,
      'SUGGESTION_DECLINED',
      `Your quest suggestion wasn't approved: ${suggestion.title}`,
      founderNote || 'The Founder decided not to move forward with this one.',
      '/dashboard/quests'
    )
    return res.json({ ok: true })
  }

  if (action === 'approve') {
    const o = overrides || {}
    let parsedDeadline: Date | null = null
    const deadlineVal = o.deadline !== undefined ? o.deadline : (suggestion.deadline ? suggestion.deadline.toISOString() : null)
    if (deadlineVal && !['null', 'n/a', 'none', 'tbd', ''].includes(String(deadlineVal).trim().toLowerCase())) {
      const d = new Date(deadlineVal)
      if (!isNaN(d.getTime())) parsedDeadline = d
    }

    const quest = await prisma.quest.create({
      data: {
        title: o.title || suggestion.title,
        category: o.category || suggestion.category,
        difficulty: o.difficulty || suggestion.difficulty,
        rankRequired: (o.rankRequired || suggestion.rankRequired) as any,
        rewardXp: o.rewardXp ?? suggestion.rewardXp,
        cashReward: o.cashReward !== undefined ? o.cashReward : suggestion.cashReward,
        instructions: o.instructions || suggestion.instructions,
        deadline: parsedDeadline,
        maxParticipants: o.maxParticipants ?? suggestion.maxParticipants,
        status: 'OPEN',
      },
    })

    await prisma.questSuggestion.update({
      where: { id },
      data: { status: 'APPROVED', founderNote: founderNote || null, resultingQuestId: quest.id },
    })

    await notify(
      suggestion.suggestedById,
      'SUGGESTION_APPROVED',
      `Your quest suggestion is now live: ${quest.title}`,
      founderNote || 'It has been officially posted to the Quest Board.',
      `/dashboard/quest/${quest.id}`
    )

    return res.json({ ok: true, quest })
  }

  res.status(400).json({ error: 'Unknown action' })
}