import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { applyTrustEvent } from '@/lib/trustEngine'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || session.user.role !== 'FOUNDER') return res.status(403).json({ error: 'Forbidden' })

  if (req.method === 'GET') {
    const [trials, tasks] = await Promise.all([
      prisma.trial.findMany({
        orderBy: { submittedAt: 'desc' },
        include: { user: { select: { id: true, name: true, nickname: true, email: true } } },
      }),
      prisma.trialTask.findMany({ orderBy: { createdAt: 'desc' } }),
    ])
    return res.json({ trials, tasks })
  }

  if (req.method === 'PUT') {
    // Assign a trial task to a specific user's trial
    const { userId, trialTaskId } = req.body
    if (!userId || !trialTaskId) return res.status(400).json({ error: 'userId and trialTaskId required' })

    const trial = await prisma.trial.update({
      where: { userId },
      data: { assignedTaskId: trialTaskId },
      include: { user: { select: { id: true, name: true, nickname: true, email: true } }, assignedTask: true },
    })

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'TRIAL_TASK_ASSIGNED',
        details: `Trial task assigned by Founder`,
      },
    })

    return res.json({ trial })
  }

  if (req.method === 'PATCH') {
    const { id, status, score, judgeNotes } = req.body
    const trial = await prisma.trial.update({
      where: { id },
      data: {
        status,
        score: score ?? undefined,
        judgeNotes: judgeNotes ?? undefined,
        reviewedAt: new Date(),
      },
      include: { user: true },
    })

    if (status === 'ACCEPTED') {
      await prisma.user.update({
        where: { id: trial.userId },
        data: { role: 'ACCEPTED_MEMBER' },
      })
      await applyTrustEvent(trial.userId, 'TRIAL_ACCEPTED', 'Trial accepted by Founder', 'FOUNDER')
      await prisma.activityLog.create({
        data: { userId: trial.userId, action: 'TRIAL_ACCEPTED', details: 'Trial accepted by Founder' },
      })
    } else if (status === 'REJECTED') {
      await prisma.activityLog.create({
        data: { userId: trial.userId, action: 'TRIAL_REJECTED', details: 'Trial rejected' },
      })
    }

    return res.json({ trial })
  }

  res.status(405).end()
}