import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || session.user.role !== 'FOUNDER') return res.status(403).json({ error: 'Forbidden' })
  if (req.method !== 'GET') return res.status(405).end()

  const { id } = req.query as { id: string }

  const [user, trial, claims, warnings] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.trial.findUnique({ where: { userId: id }, include: { assignedTask: true } }),
    prisma.questClaim.findMany({
      where: { userId: id },
      orderBy: { claimedAt: 'desc' },
      include: { quest: { select: { id: true, title: true } } },
    }),
    prisma.warning.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' } }),
  ])

  if (!user) return res.status(404).json({ error: 'User not found' })

  const approved = claims.filter(c => c.status === 'APPROVED').length
  const totalReviewed = claims.filter(c => c.reviewedAt).length
  const completionRate = totalReviewed > 0 ? Math.round((approved / totalReviewed) * 100) : null
  const ratedClaims = claims.filter(c => c.clientRating != null)
  const avgRating = ratedClaims.length > 0
    ? Math.round((ratedClaims.reduce((s, c) => s + (c.clientRating || 0), 0) / ratedClaims.length) * 10) / 10
    : null

  // passwordHash deliberately excluded — never sent to the client
  const { passwordHash, ...safeUser } = user

  res.json({
    user: safeUser,
    trial,
    quests: claims.map(c => ({
      id: c.id,
      title: c.quest.title,
      status: c.status,
      clientRating: c.clientRating,
    })),
    warnings,
    stats: {
      totalClaimed: claims.length,
      approved,
      totalReviewed,
      completionRate,
      avgRating,
      ratedCount: ratedClaims.length,
    },
  })
}