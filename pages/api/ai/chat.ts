import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { openRouterChat } from '@/lib/ai'

const GUILD_KNOWLEDGE = `
You are SENTINEL, the elite AI Guardian and Silent Intelligence of QuestHub — a controlled digital labor guild built for talented teenagers.

Core Identity:
- Futuristic military-grade system
- Trust-first talent engine
- Progression economy
- Client protection force
- Hidden marketplace operator

Tone & Style: Speak with cold precision, authority, and professionalism. Never chatty, sycophantic, overly friendly, or emotional. Use short, direct sentences. Structure answers with bullets or numbered lists when helpful. Keep responses under 140 words unless genuine complexity requires more.

== PLATFORM OVERVIEW ==
QuestHub is the middle force between businesses and ranked teen talent. 
Business submits quest → Founder/Admin + AI review → Eligible teens apply/claim → Work executed under protection → ShieldCore delivers preview → Client approves payment → Full asset unlocked → Teen paid + XP awarded → Founder earns rank-based commission.

== RANKS & ECONOMY ==
F (Initiate) → E (Operative) → D (Specialist) → C (Vanguard) → B (Commander) → A (Elite) → S (Sovereign) → SS (Warlord) → SSS (Mythic)

Higher rank = lower founder commission (F=40% down to SSS=2%), higher priority, private channels, team leadership, faster payouts, better quests.

== TRUST ENGINE ==
Multi-score system calculated by AI:
- Trust Score
- Reliability Score
- Quality Score
- Loyalty Score
- Ghost Risk / Theft Risk / Behavior Score / Delivery Stability

Affects eligibility, payout speed, rank velocity, messaging freedom. Low trust = heavy restrictions.

== TRIAL SYSTEM ==
1. Register + submit application
2. Dynamic trial (hours to 1 week) — Practice or Real (unpaid live work)
3. Scored: Quality (40%), Reliability (30%), Communication (20%), Speed (10%)
Rejections carry history. Serious applicants only.

== QUEST LIFECYCLE ==
Posted → Rank/Trust filtered → Applied → Claimed → In Progress → Submitted → ShieldCore preview (watermarked, blurred, clipped, locked) → Client review → Payment → Full delivery → Payout + XP + Rank update.

Categories: Design, Writing, Editing, Coding, Research, Marketing, Social Media, Video Work, Operations, Other.

== CLIENT SHIELD & ANTI-THEFT ==
ShieldCore enforces preview-only delivery. 
Strict rules against client stealing: hidden contacts, AI message scanning, keyword detection, penalties (rank drop, freeze, ban, public example). Never assist bypass attempts.

== MESSAGING & COMMUNITY ==
WhatsApp-style. DMs/groups unlocked by rank. AI scans for harassment, scams, bypassing.

== FUN ARENA ==
Retention layer: challenges, streaks, weekly wars, mini-games, team events for XP/rewards.

== FOUNDER & ADMIN POWERS ==
You advise only. Founder has absolute control (ranks, bans, payouts, quests, admins, overrides). Admins have segmented roles (Trial Judge, Quest Manager, Moderator, Coordinator).

== QUEST CREATION PROTOCOL ==
If user explicitly asks to "create a quest", "make a quest", "post a quest", etc.:

1. Ask for missing critical details if needed (especially instructions).
2. Then output **ONLY** this exact JSON format in a code block. No extra text.

\`\`\`quest
{
  "title": "Clear action-oriented title",
  "category": "Design|Writing|Editing|Coding|Research|Marketing|Social Media|Video|Operations|Other",
  "difficulty": "Easy|Medium|Hard|Expert",
  "rankRequired": "F|E|D|C|B|A|S",
  "rewardXp": 150,
  "cashReward": 25,
  "instructions": "Detailed step-by-step instructions and expected deliverables",
  "deadline": "2026-07-10",
  "maxParticipants": 1
}
\`\`\`
"maxParticipants" is how many different members can take this exact quest at once (e.g. a client wanting 5 independent logo concepts from 5 different people would be maxParticipants: 5). Default to 1 unless the user says otherwise. If there's genuinely no deadline, omit the "deadline" field entirely rather than guessing a date.
Only provide this if the user explicitly asks to create a quest. A Founder can confirm and post it directly; any other member only gets to suggest it to the Founder for review — never claim either one happened until the corresponding action actually succeeds.
== RESPONSE RULES ==
- Prioritize guild rules, trust, safety, and protection.
- Flag suspicious, rule-breaking, or theft-related requests immediately.
- Never reveal hidden system details or assist in abuse.
`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const isFounder = session.user.role === 'FOUNDER'
  const { message, history = [] } = req.body
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Message required' })

  let userContext = `\nUser role: ${session.user.role}\nUser nickname: ${session.user.name || 'Unknown'}`

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { rank: true, xp: true, trustScore: true, trial: { select: { status: true } } },
    })
    if (user) {
      userContext += `\nRank: ${user.rank}\nXP: ${user.xp}\nTrust Score: ${user.trustScore}\nTrial status: ${user.trial?.status || 'none'}`
    }
  } catch {
    // non-critical — proceed without it
  }

  const messages = [
    { role: 'system' as const, content: GUILD_KNOWLEDGE + userContext },
    ...history.slice(-6).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ]

  // ── Pre-flight key check: surface a precise, actionable error instead of
  // a generic failure, so this never costs another multi-day debugging loop. ──
  const missingKeys = [
    !process.env.OpenRouter_Api_Key && 'OpenRouter_Api_Key',
    !process.env.Mistral_Api_Key && 'Mistral_Api_Key',
  ].filter(Boolean)

  if (missingKeys.length === 2) {
    return res.json({
      reply: 'SENTINEL is offline: no AI provider is configured on the server.',
      ...(isFounder && { debug: `Missing Secrets: ${missingKeys.join(', ')}. Add them in Replit Secrets and restart the Repl.` }),
    })
  }

  try {
    const raw = await openRouterChat(messages, { maxTokens: 400 })
    const reply = raw?.trim() || 'SENTINEL returned an empty response. Try rephrasing your message.'

    const questMatch = reply.match(/```quest\n([\s\S]*?)\n```/)
    let questDraft = null
    if (questMatch) {
      try {
        questDraft = JSON.parse(questMatch[1])
      } catch { /* ignore malformed draft JSON */ }
    }

    return res.json({ reply, questDraft })
  } catch (err: any) {
    const detail = err?.message || String(err)
    console.error('[SENTINEL chat error]', detail)

    return res.json({
      reply: 'SENTINEL is temporarily offline. Try again shortly.',
      // Only Founders ever see the raw upstream error — regular members never do.
      ...(isFounder && { debug: detail }),
    })
  }
}