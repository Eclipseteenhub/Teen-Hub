import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { awardEligibleAchievements } from '@/lib/achievements'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const awarded = await awardEligibleAchievements(session.user.id)
  return res.json({ awarded, count: awarded.length })
}a