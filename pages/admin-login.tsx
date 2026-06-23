import { useState } from 'react'
import Head from 'next/head'
import { signIn, getSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import { GlowInput } from '@/components/ui/GlowInput'
import GlowButton from '@/components/ui/GlowButton'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    })

    if (result?.error) {
      setError('Invalid credentials or account suspended.')
      setLoading(false)
      return
    }

    const session = await getSession()
    const role = (session?.user as any)?.role

    if (role === 'FOUNDER') {
      router.push('/founder')
    } else if (['ADMIN', 'MODERATOR', 'COORDINATOR'].includes(role)) {
      router.push('/admin')
    } else {
      // Credentials were valid for a normal member account — don't leave
      // them signed in here. Clear the session before showing the error.
      await signOut({ redirect: false })
      setError('Access denied. This login is for admin and founder accounts only.')
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Admin Access — QuestHub Guild</title>
      </Head>

      <div className="min-h-screen bg-deep-black grid-bg flex items-center justify-center px-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 bg-red-900/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative bg-[#08000f] border border-red-500/25 p-8 sm:p-10 w-full max-w-md">
          <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-red-500/50" />
          <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-red-500/50" />
          <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-red-500/50" />
          <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-red-500/50" />

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-900/20 border border-red-500/30 rotate-45 mb-4">
              <span className="font-orbitron font-black text-red-400 -rotate-45 text-xl">⬛</span>
            </div>
            <div className="font-orbitron text-[10px] text-red-400/70 tracking-[0.4em] uppercase mb-2">Restricted Portal</div>
            <h1 className="font-orbitron font-black text-xl text-white tracking-widest">ADMIN ACCESS</h1>
            <p className="font-rajdhani text-slate-500 text-sm mt-2">
              Authorized personnel only. All access is logged.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <GlowInput
              label="Admin Email"
              type="email"
              placeholder="admin@questhub.io"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <GlowInput
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="bg-red-900/20 border border-red-500/40 px-4 py-3 text-red-300 text-sm font-rajdhani">
                ⚠ {error}
              </div>
            )}

            <GlowButton type="submit" variant="primary" size="md" loading={loading} className="w-full">
              Authenticate
            </GlowButton>
          </form>

          <div className="mt-6 pt-5 border-t border-red-500/10 text-center">
            <p className="font-rajdhani text-xs text-slate-700">
              Not an admin?{' '}
              <a href="/auth/login" className="text-purple-500/60 hover:text-purple-400 transition-colors">
                Member login →
              </a>
            </p>
          </div>

          <div className="mt-4 bg-black/40 border border-red-500/10 px-3 py-2">
            <p className="font-orbitron text-[9px] text-red-500/40 text-center tracking-widest">
              UNAUTHORIZED ACCESS WILL BE PROSECUTED
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await (await import('next-auth')).getServerSession(
    context.req,
    context.res,
    (await import('@/lib/auth')).authOptions
  )
  if (session) {
    const role = (session.user as any).role
    if (role === 'FOUNDER') return { redirect: { destination: '/founder', permanent: false } }
    if (['ADMIN','MODERATOR','COORDINATOR'].includes(role)) return { redirect: { destination: '/admin', permanent: false } }
  }
  return { props: {} }
}