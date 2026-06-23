import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || session.user.role !== 'FOUNDER') return res.status(403).json({ error: 'Forbidden' })
  if (req.method !== 'GET') return res.status(405).end()

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    flaggedChat,
    flaggedDMs,
    unresolvedReports,
    recentWarnings,
    riskyUsers,
    recentWarnCount,
  ] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { flagged: true },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { user: { select: { id: true, nickname: true, name: true } } },
    }),
    prisma.message.findMany({
      where: { flagged: true },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        from: { select: { id: true, nickname: true, name: true } },
        to: { select: { id: true, nickname: true, name: true } },
      },
    }),
    prisma.report.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      include: {
        reportedBy: { select: { id: true, nickname: true, name: true } },
        reportedAbout: { select: { id: true, nickname: true, name: true } },
      },
    }),
    prisma.warning.findMany({
      where: { createdAt: { gte: since7d } },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { user: { select: { id: true, nickname: true, name: true } } },
    }),
    prisma.user.findMany({
      where: { trustLevel: { in: ['RISK', 'WATCH'] }, status: { not: 'BANNED' } },
      select: { id: true, nickname: true, name: true, email: true, trustScore: true, trustLevel: true, status: true },
      orderBy: { trustScore: 'asc' },
      take: 20,
    }),
    prisma.warning.count({ where: { createdAt: { gte: since24h } } }),
  ])

  res.json({
    flaggedChat,
    flaggedDMs,
    unresolvedReports,
    recentWarnings,
    riskyUsers,
    recentWarnCount,
  })
}