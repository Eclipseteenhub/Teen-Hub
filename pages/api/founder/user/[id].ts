import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || session.user.role !== 'FOUNDER') return res.status(403).json({ error: 'Forbidden' })
  if (req.method !== 'PATCH' && req.method !== 'DELETE') return res.status(405).end()

  const { id } = req.query as { id: string }
  const action = req.method === 'DELETE' ? 'delete' : req.body?.action
  const value = req.body?.value

  try {
    // ── Permanent deletion takes a completely different path: it has to
    // clean up every table that references this user before the row itself
    // can go, since most of those relations are NOT cascade-delete in the
    // schema. We do it all in one transaction so it's all-or-nothing. ──
    if (action === 'delete') {
      if (id === session.user.id) {
        return res.status(400).json({ error: "You can't delete your own account." })
      }

      const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
      if (!target) return res.status(404).json({ error: 'User not found' })
      if (target.role === 'FOUNDER') {
        return res.status(400).json({ error: 'Founder accounts cannot be deleted from here.' })
      }

      await prisma.$transaction([
        prisma.account.deleteMany({ where: { userId: id } }),
        prisma.session.deleteMany({ where: { userId: id } }),
        prisma.message.deleteMany({ where: { OR: [{ fromId: id }, { toId: id }] } }),
        prisma.chatMessage.deleteMany({ where: { userId: id } }),
        prisma.xpLog.deleteMany({ where: { userId: id } }),
        prisma.adminNote.deleteMany({ where: { OR: [{ aboutId: id }, { byId: id }] } }),
        prisma.report.deleteMany({ where: { OR: [{ reportedById: id }, { reportedAboutId: id }] } }),
        prisma.warning.deleteMany({ where: { userId: id } }),
        prisma.activityLog.deleteMany({ where: { userId: id } }),
        prisma.arenaEntry.deleteMany({ where: { userId: id } }),
        prisma.feedbackReply.deleteMany({ where: { authorId: id } }),
        prisma.feedback.updateMany({ where: { userId: id }, data: { userId: null } }),
        prisma.quest.updateMany({ where: { claimedById: id }, data: { claimedById: null, status: 'OPEN', claimedAt: null } }),
        prisma.trial.deleteMany({ where: { userId: id } }),
        prisma.user.delete({ where: { id } }),
      ])

      return res.json({ ok: true })
    }

    if (action === 'setRank') {
      await prisma.user.update({ where: { id }, data: { rank: value } })
    } else if (action === 'ban') {
      await prisma.user.update({ where: { id }, data: { status: 'BANNED' } })
    } else if (action === 'unban') {
      await prisma.user.update({ where: { id }, data: { status: 'ACTIVE' } })
    } else if (action === 'suspend') {
      await prisma.user.update({ where: { id }, data: { status: 'SUSPENDED' } })
    } else if (action === 'warn') {
      await prisma.warning.create({
        data: { userId: id, reason: 'Founder warning issued', issuedBy: session.user.id },
      })
    } else if (action === 'promote') {
      await prisma.user.update({ where: { id }, data: { role: value } })
    }

    await prisma.activityLog.create({
      data: { userId: id, action: `FOUNDER_${action.toUpperCase()}`, details: `Founder applied ${action}` },
    })

    res.json({ ok: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}