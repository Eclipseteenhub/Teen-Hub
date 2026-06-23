import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { moderateMessage } from '@/lib/ai'
import { applyTrustEvent } from '@/lib/trustEngine'

const RANK_LEVEL: Record<string, number> = { F:0,E:1,D:2,C:3,B:4,A:5,S:6,SS:7,SSS:8 }
const CHANNEL_RANK: Record<string, string> = { elite: 'A' }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const { channel } = req.query as { channel: string }
  const userRank = session.user.rank as string
  const minRank = CHANNEL_RANK[channel]
  if (minRank && RANK_LEVEL[userRank] < RANK_LEVEL[minRank]) {
    return res.status(403).json({ error: `This channel requires Rank ${minRank}+` })
  }

  if (req.method === 'GET') {
    const messages = await prisma.chatMessage.findMany({
      where: { channel }, orderBy: { createdAt: 'asc' }, take: 50,
      include: { user: { select: { id: true, name: true, nickname: true, rank: true } } },
    })
    return res.json({ messages })
  }

  if (req.method === 'POST') {
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ error: 'Empty message' })

    const moderation = await moderateMessage(content)

    if (!moderation.safe) {
      await applyTrustEvent(
        session.user.id,
        moderation.stage === 'Mistral' ? 'MESSAGE_SEVERE' : 'MESSAGE_FLAGGED',
        moderation.reason || 'Flagged by EchoScan', 'ECHOSCAN'
      )

      // Severe + founder-notify cases get blocked outright, never posted
      if (moderation.notifyFounder) {
        console.warn('[ECHOSCAN] Founder notify (channel):', { channel, userId: session.user.id, reason: moderation.reason })
        return res.status(400).json({ error: moderation.reason || 'Message blocked.', blocked: true })
      }

      // Milder flags get posted but marked, so moderators can see them in channel
      const stored = await prisma.chatMessage.create({
        data: { userId: session.user.id, channel, content: content.trim(), flagged: true, flagReason: moderation.reason || moderation.stage },
        include: { user: { select: { id: true, name: true, nickname: true, rank: true } } },
      })
      return res.json({ message: stored, flagged: true })
    }

    const message = await prisma.chatMessage.create({
      data: { userId: session.user.id, channel, content: content.trim() },
      include: { user: { select: { id: true, name: true, nickname: true, rank: true } } },
    })
    return res.json({ message })
  }

  res.status(405).end()
}