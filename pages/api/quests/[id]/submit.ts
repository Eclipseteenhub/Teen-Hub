import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query as { id: string }
  const { submissionUrl, submissionNote } = req.body
  if (!submissionNote?.trim()) return res.status(400).json({ error: 'A submission note is required' })

  const quest = await prisma.quest.findUnique({ where: { id } })
  if (!quest) return res.status(404).json({ error: 'Quest not found' })

  const claim = await prisma.questClaim.findUnique({
    where: { questId_userId: { questId: id, userId: session.user.id } },
  })
  if (!claim) return res.status(403).json({ error: 'You have not claimed this quest' })
  if (!['CLAIMED', 'IN_PROGRESS'].includes(claim.status)) {
    return res.status(400).json({ error: 'This quest is not awaiting submission' })
  }

  const updated = await prisma.questClaim.update({
    where: { id: claim.id },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      submissionUrl: submissionUrl || null,
      submissionNote: submissionNote.trim(),
    },
  })

  await prisma.activityLog.create({
    data: { userId: session.user.id, action: 'QUEST_SUBMITTED', details: `Submitted quest: ${quest.title}` },
  })

  res.json({ claim: updated })
}