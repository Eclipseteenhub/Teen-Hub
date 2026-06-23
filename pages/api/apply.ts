import { evaluateTrial } from '@/lib/ai'                  import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { name, nickname, age, dob, email, skills, strengths, whyJoin, availability, contactInfo, portfolioUrl } = req.body
  const ageValue = age ?? dob

  if (!name || !nickname || !ageValue || !email || !skills?.length || !strengths || !whyJoin || !availability || !contactInfo) {
    return res.status(400).json({ error: 'All required fields must be filled.' })
  }

  // ── APPLICATION LINKING SYSTEM ──────────────────────────────────────────
  // Option A: User applies first → system links by email if account exists later
  // Option B: User already has account → merge trial into existing profile
  // This closes the duplicate-identity loophole.

  const existingByEmail = await prisma.user.findUnique({ where: { email } })
  const existingByNick  = await prisma.user.findFirst({ where: { nickname } })

  // Block if nickname conflicts with a DIFFERENT account
  if (existingByNick && existingByNick.email !== email) {
    return res.status(400).json({ error: 'Nickname is already taken by another user.' })
  }

  // If email already has an account → link trial to it (Option B)
  if (existingByEmail) {
    const alreadyHasTrial = await prisma.trial.findUnique({ where: { userId: existingByEmail.id } })
    if (alreadyHasTrial) {
      return res.status(409).json({ error: 'You already have a trial application on file.' })
    }

    // Merge: upgrade role to TRIAL_MEMBER, attach trial
    await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        role: 'TRIAL_MEMBER',
        skills,
        ...(name ? { name } : {}),
        ...(nickname && !existingByEmail.nickname ? { nickname } : {}),
      },
    })

    await prisma.trial.create({
      data: {
        userId: existingByEmail.id,
        age: parseInt(ageValue),
        skills,
        strengths,
        whyJoin,
        availability,
        contactInfo,
        portfolioUrl: portfolioUrl || null,
        status: 'PENDING',
      },
    })
    const aiResult = await evaluateTrial({
      strengths, whyJoin, skills, availability, age: parseInt(ageValue),
    }).catch(() => null)

    if (aiResult) {
      await prisma.trial.update({
        where: { userId: existingByEmail ? existingByEmail.id : user.id },
        data: {
          aiScore: aiResult.score,
          aiSummary: aiResult.summary,
          aiRecommendation: aiResult.recommendation,
          status: 'UNDER_REVIEW',
        },
      })
    }                                        
    
    await prisma.activityLog.create({
      data: { userId: existingByEmail.id, action: 'APPLIED', details: 'Trial linked to existing account' },
    })

    return res.status(201).json({ success: true, linked: true })
  }

  // Option A: No account yet → create one with temp password
  const tempPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10)

  const user = await prisma.user.create({
    data: {
      name,
      nickname,
      email,
      passwordHash: tempPassword,
      role: 'TRIAL_MEMBER',
      rank: 'F',
      xp: 0,
      skills,
    },
  })

  await prisma.trial.create({
    data: {
      userId: user.id,
      age: parseInt(ageValue),
      skills,
      strengths,
      whyJoin,
      availability,
      contactInfo,
      portfolioUrl: portfolioUrl || null,
      status: 'PENDING',
    },
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'APPLIED',
      details: 'Submitted guild application',
    },
  })

  return res.status(201).json({ success: true })
}