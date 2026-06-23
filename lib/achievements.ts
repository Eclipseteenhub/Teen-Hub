import { prisma } from './prisma'
import { checkAchievements } from './ai'
import { awardXP } from './xp'

export async function awardEligibleAchievements(userId: string) {
  const [user, allAchievements, existing, questsApproved] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { rank: true, xp: true, trustScore: true, createdAt: true } }),
    prisma.achievement.findMany({ where: { isActive: true }, select: { id: true, name: true, condition: true } }),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
    prisma.quest.count({ where: { claimedById: userId, status: 'APPROVED' } }),
  ])
  if (!user) return []

  const daysActive = Math.floor((Date.now() - user.createdAt.getTime()) / 86400000)

  const earnedIds = await checkAchievements(
    {
      userId, rank: user.rank, xp: user.xp, questsCompleted: questsApproved,
      trustScore: user.trustScore, daysActive,
      existingAchievements: existing.map(e => e.achievementId),
    },
    allAchievements
  )

  const awarded = []
  for (const achId of earnedIds) {
    try {
      const userAch = await prisma.userAchievement.create({
        data: { userId, achievementId: achId, awardedByAI: true },
        include: { achievement: true },
      })
      if (userAch.achievement.xpBonus) {
        await awardXP(userId, userAch.achievement.xpBonus, `Achievement: ${userAch.achievement.name}`)
      }
      await prisma.activityLog.create({
        data: { userId, action: 'ACHIEVEMENT_EARNED', details: `Earned: ${userAch.achievement.name}` },
      })
      awarded.push(userAch)
    } catch { /* already awarded — unique constraint, skip */ }
  }
  return awarded
}