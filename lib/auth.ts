import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { Role, Rank } from '@prisma/client'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const FOUNDER_EMAIL = process.env.FOUNDER_BOOTSTRAP_EMAIL
        const FOUNDER_PASSWORD = process.env.FOUNDER_BOOTSTRAP_PASSWORD

        // Special bootstrap login — auto-creates/ensures a FOUNDER account.
        // Only active if you've set your own dedicated founder credentials
        // in .env. This intentionally does NOT fall back to a hardcoded
        // default email/password, so a normal member typing their own
        // credentials here can never accidentally match this branch.
        if (
          FOUNDER_EMAIL &&
          FOUNDER_PASSWORD &&
          credentials.email === FOUNDER_EMAIL &&
          credentials.password === FOUNDER_PASSWORD
        ) {
          try {
            let user = await prisma.user.findUnique({ where: { email: FOUNDER_EMAIL } })

            if (!user) {
              // Guard against the nickname unique constraint colliding with
              // a pre-existing row (e.g. a stray "Founder" nickname from an
              // earlier manual test). Fall back to a guaranteed-unique value.
              const existingNickname = await prisma.user.findUnique({ where: { nickname: 'Founder' } })
              const nickname = existingNickname ? `Founder-${Date.now()}` : 'Founder'

              const hash = await bcrypt.hash(FOUNDER_PASSWORD, 10)
              user = await prisma.user.create({
                data: {
                  email: FOUNDER_EMAIL,
                  name: 'Founder',
                  nickname,
                  passwordHash: hash,
                  role: 'FOUNDER',
                  rank: 'SSS',
                  xp: 0,
                },
              })
            } else if (user.role !== 'FOUNDER') {
              user = await prisma.user.update({ where: { id: user.id }, data: { role: 'FOUNDER' } })
            }

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              rank: user.rank,
              xp: user.xp,
              nickname: user.nickname,
            }
          } catch (err) {
            // TEMPORARY DIAGNOSTIC — remove once founder login is confirmed working.
            // Surfaces the real Prisma/DB error in your server console instead of
            // letting NextAuth swallow it as a generic "invalid credentials".
            console.error('[founder-debug] founder bootstrap threw:', err)
            return null
          }
        }

        // Normal login flow
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        if (user.status === 'BANNED' || user.status === 'SUSPENDED') return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          rank: user.rank,
          xp: user.xp,
          nickname: user.nickname,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.rank = (user as any).rank
        token.xp = (user as any).xp
        token.nickname = (user as any).nickname
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.rank = token.rank as Rank
        session.user.xp = token.xp as number
        session.user.nickname = token.nickname as string
      }
      return session
    },
  },
}