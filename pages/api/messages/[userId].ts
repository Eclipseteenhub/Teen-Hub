import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { moderateMessage } from '@/lib/ai'
import { applyTrustEvent } from '@/lib/trustEngine'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { userId: otherId } = req.query as { userId: string }
  const myId = session.user.id

  if (req.method === 'GET') {
    const messages = await prisma.message.findMany({
      where: { OR: [{ fromId: myId, toId: otherId }, { fromId: otherId, toId: myId }] },
      orderBy: { createdAt: 'asc' },
      include: { from: { select: { id: true, name: true, nickname: true } } },
    })
    return res.json({ messages })
  }

  if (req.method === 'POST') {
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ error: 'Empty message' })

    // EchoScan: real AI moderation pipeline (HF → Risk → Mistral), not a regex toy
    const moderation = await moderateMessage(content)

    if (!moderation.safe) {
      await applyTrustEvent(
        myId,
        moderation.stage === 'Mistral' ? 'MESSAGE_SEVERE' : 'MESSAGE_FLAGGED',
        moderation.reason || 'Message flagged by EchoScan',
        'ECHOSCAN'
      )

      await prisma.activityLog.create({
        data: {
          userId: myId,
          action: 'MESSAGE_BLOCKED',
          details: `EchoScan blocked message to ${otherId} (stage: ${moderation.stage}) — ${moderation.reason}`,
        },
      })

      if (moderation.notifyFounder) {
        // TODO: wire to a real channel — email, Discord webhook, etc.
        console.warn('[ECHOSCAN] Founder notify:', { from: myId, to: otherId, reason: moderation.reason })
      }

      return res.status(400).json({
        error: moderation.reason || 'Message blocked by EchoScan.',
        blocked: true,
        moderation,
      })
    }

    const message = await prisma.message.create({
      data: { fromId: myId, toId: otherId, content: content.trim() },
      include: { from: { select: { id: true, name: true, nickname: true } } },
    })
    return res.json({ message })
  }

  res.status(405).end()
}