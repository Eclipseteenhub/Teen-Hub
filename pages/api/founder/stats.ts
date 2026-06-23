import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || session.user.role !== 'FOUNDER') return res.status(403).json({ error: 'Forbidden' })

  const [
    totalUsers,
    activeUsers,
    bannedUsers,
    suspendedUsers,
    totalQuests,
    openQuests,
    claimedQuests,
    submittedQuests,
    approvedQuests,
    pendingTrials,
    totalTrials,
    unresolvedReports,
    flaggedChatCount,
    flaggedMessageCount,
    riskyUserCount,
    pendingPayouts,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'BANNED' } }),
    prisma.user.count({ where: { status: 'SUSPENDED' } }),
    prisma.quest.count(),
    prisma.quest.count({ where: { status: 'OPEN' } }),
    prisma.quest.count({ where: { status: { in: ['CLAIMED', 'IN_PROGRESS'] } } }),
    prisma.quest.count({ where: { status: 'SUBMITTED' } }),
    prisma.quest.count({ where: { status: 'APPROVED' } }),
    prisma.trial.count({ where: { status: 'PENDING' } }),
    prisma.trial.count(),
    prisma.report.count({ where: { resolved: false } }),
    prisma.chatMessage.count({ where: { flagged: true } }),
    prisma.message.count({ where: { flagged: true } }),
    prisma.user.count({ where: { trustLevel: { in: ['RISK', 'WATCH'] } } }),
    prisma.quest.aggregate({
      where: { payoutStatus: 'PENDING' },
      _sum: { cashReward: true },
      _count: true,
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { nickname: true, name: true } } },
    }),
  ])

  res.json({
    totalUsers,
    activeUsers,
    bannedUsers,
    suspendedUsers,
    totalQuests,
    activeQuests: openQuests,
    openQuests,
    claimedQuests,
    submittedQuests,
    approvedQuests,
    pendingTrials,
    totalTrials,
    unresolvedReports,
    flaggedChatCount,
    flaggedMessageCount,
    flaggedTotal: flaggedChatCount + flaggedMessageCount,
    riskyUserCount,
    pendingPayoutTotal: pendingPayouts._sum.cashReward || 0,
    pendingPayoutCount: pendingPayouts._count,
    recentActivity,
  })
}