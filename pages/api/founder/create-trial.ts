import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { draftTrialFromNotes, evaluateTrial } from '@/lib/ai'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session || session.user.role !== 'FOUNDER') return res.status(403).json({ error: 'Founder only' })
  if (req.method !== 'POST') return res.status(405).end()

  const { name, nickname, email, age, skills, rawNotes, availability, portfolioUrl, contactInfo } = req.body
  if (!name || !email || !rawNotes || !skills?.length) {
    return res.status(400).json({ error: 'name, email, skills, and rawNotes are required' })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ error: 'A user with this email already exists' })

  const draft = await draftTrialFromNotes({ rawNotes, skills, availability })

  const tempPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10)
  const user = await prisma.user.create({
    data: { name, nickname: nickname || null, email, passwordHash: tempPassword, role: 'TRIAL_MEMBER', rank: 'F', xp: 0, skills },
  })

  const aiResult = await evaluateTrial({
    strengths: draft.strengths, whyJoin: draft.whyJoin, skills,
    availability: draft.availability, age: age ? parseInt(age) : undefined,
  }).catch(() => null)

  const trial = await prisma.trial.create({
    data: {
      userId: user.id, age: age ? parseInt(age) : 16, skills,
      strengths: draft.strengths, whyJoin: draft.whyJoin, availability: draft.availability,
      contactInfo: contactInfo || email, portfolioUrl: portfolioUrl || null,
      status: aiResult ? 'UNDER_REVIEW' : 'PENDING',
      aiScore: aiResult?.score, aiSummary: aiResult?.summary, aiRecommendation: aiResult?.recommendation,
    },
  })

  await prisma.activityLog.create({
    data: { userId: user.id, action: 'APPLIED', details: 'Trial created directly by Founder (AI-drafted)' },
  })

  res.status(201).json({ user, trial, draft, aiResult })
}