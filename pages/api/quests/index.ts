import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { matchQuests } from '@/lib/ai'

const ROLE_LEVEL: Record<string, number> = {
  GUEST: 0, TRIAL_MEMBER: 1, ACCEPTED_MEMBER: 2, ACTIVE_WORKER: 3,
  MODERATOR: 4, COORDINATOR: 5, ADMIN: 6, FOUNDER: 7,
}
const ACTIVE_CLAIM_STATUSES = ['CLAIMED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })
  if (ROLE_LEVEL[session.user.role] < ROLE_LEVEL['ACCEPTED_MEMBER']) {
    return res.status(403).json({ error: 'Access denied' })
  }

  // Everyone sees the general OPEN/FULL board, but a member must also be able
  // to see their OWN quest after submitting it — otherwise it just vanishes
  // from view the moment they hit Submit, with no way back. A quest they have
  // a claim on stays visible to them even once it's CLOSED.
  const quests = await prisma.quest.findMany({
    where: {
      OR: [
        { status: { in: ['OPEN', 'FULL'] } },
        { claims: { some: { userId: session.user.id } } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      claims: { where: { userId: session.user.id } },
      _count: { select: { claims: { where: { status: { in: ACTIVE_CLAIM_STATUSES } } } } },
    },
  })

  const shaped = quests.map(q => ({
    ...q,
    myClaim: q.claims[0] || null,
    slotsFilled: q._count.claims,
    slotsTotal: q.maxParticipants,
    claims: undefined,
    _count: undefined,
  }))

  const openQuests = shaped.filter(q => q.status === 'OPEN' && !q.myClaim)
  let recommendedIds: string[] = []

  // ── AI quest matching: rank OPEN quests by fit for this member.
  // matchQuests already falls back to the original order internally if the
  // AI call fails, so this never blocks or breaks the quest board. ──
  if (openQuests.length > 1) {
    const member = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { rank: true, xp: true, trustScore: true, skills: true },
    })
    if (member) {
      recommendedIds = await matchQuests(
        { rank: member.rank, skills: member.skills || [], xp: member.xp, trustScore: member.trustScore },
        openQuests.map(q => ({ id: q.id, title: q.title, category: q.category, difficulty: q.difficulty }))
      )
    }
  }

  const rankOf = new Map(recommendedIds.map((id, i) => [id, i]))
  const sortedOpen = [...openQuests].sort((a, b) => (rankOf.get(a.id) ?? 999) - (rankOf.get(b.id) ?? 999))
  const topPickIds = new Set(recommendedIds.slice(0, 3))
  const others = shaped.filter(q => q.status !== 'OPEN' || q.myClaim)

  const result = [...sortedOpen, ...others].map(q => ({ ...q, aiRecommended: topPickIds.has(q.id) }))

  res.json({ quests: result })
}