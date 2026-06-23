import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import GlowButton from '@/components/ui/GlowButton'
import { GlowInput } from '@/components/ui/GlowInput'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (res?.error) {
      setError('Invalid credentials or account suspended.')
      return
    }

    const session = await getSession()
    const role = (session?.user as any)?.role

    if (role === 'FOUNDER') {
      router.push('/founder')
    } else if (['ADMIN', 'MODERATOR', 'COORDINATOR'].includes(role)) {
      router.push('/admin')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <>
      <Head>
        <title>Login — QuestHub Guild</title>
      </Head>

      <div className="min-h-screen bg-deep-black grid-bg flex items-center justify-center px-4 py-12">

        {/* Background glow */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-800/6 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md z-10">

          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex flex-col items-center gap-2 mb-6 group">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 bg-purple-600/30 rotate-45 group-hover:bg-purple-500/40 transition-all duration-300" />
                <div className="absolute inset-1.5 bg-purple-500/15 rotate-45" />
                <span className="absolute inset-0 flex items-center justify-center text-purple-300 font-orbitron font-black text-lg">Q</span>
              </div>
            </Link>

            <div className="inline-flex items-center gap-3 mb-3">
              <div className="w-10 h-px bg-purple-500/40" />
              <span className="font-orbitron text-[10px] text-purple-400 tracking-[0.4em] uppercase">
                Guild Access Terminal
              </span>
              <div className="w-10 h-px bg-purple-500/40" />
            </div>

            <h1 className="font-orbitron font-black text-3xl sm:text-4xl text-white glow-text mb-2">
              QUESTHUB
            </h1>
            <p className="font-rajdhani text-slate-500 text-sm tracking-wider">
              Enter your credentials to access the guild network
            </p>
          </div>

          {/* Success message if redirected from register */}
          {router.query.registered && (
            <div className="bg-green-900/20 border border-green-500/30 px-4 py-3 mb-4 flex items-center gap-2">
              <span className="text-green-400 text-sm">✓</span>
              <p className="font-rajdhani text-green-300 text-sm">
                Account created successfully. Sign in to access the guild.
              </p>
            </div>
          )}

          {/* Card */}
          <div className="relative bg-card-bg glow-border p-6 sm:p-8">
            {/* Corner decorations */}
            <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-purple-500/60" />
            <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-purple-500/60" />
            <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-purple-500/60" />
            <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-purple-500/60" />

            {/* Scan line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

            <form onSubmit={handleLogin} className="flex flex-col gap-5">

              <GlowInput
                label="Email Address"
                type="email"
                placeholder="operative@guild.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <div className="flex flex-col gap-1.5">
                <GlowInput
                  label="Password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-500/30 px-4 py-3 flex items-center gap-2">
                  <span className="text-red-400 text-sm flex-shrink-0">⚠</span>
                  <p className="font-rajdhani text-red-300 text-sm">{error}</p>
                </div>
              )}

              <GlowButton
                type="submit"
                size="lg"
                loading={loading}
                className="w-full mt-1"
              >
                Access Guild Network
              </GlowButton>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-purple-500/10" />
              <span className="font-rajdhani text-xs text-slate-700 tracking-widest uppercase">or</span>
              <div className="flex-1 h-px bg-purple-500/10" />
            </div>

            <div className="text-center">
              <p className="font-rajdhani text-slate-600 text-sm">
                No guild access yet?{' '}
                <Link
                  href="/auth/register"
                  className="text-purple-400 hover:text-purple-300 transition-colors font-semibold"
                >
                  Create an account
                </Link>
              </p>
              <p className="font-rajdhani text-slate-600 text-sm mt-2">
                Want to join the guild?{' '}
                <Link
                  href="/apply"
                  className="text-purple-400 hover:text-purple-300 transition-colors font-semibold"
                >
                  Apply here
                </Link>
              </p>
            </div>
          </div>

          {/* Back link */}
          <div className="text-center mt-6">
            <Link
              href="/"
              className="font-rajdhani text-slate-700 text-xs hover:text-slate-500 tracking-[0.2em] uppercase transition-colors"
            >
              ← Return to Base
            </Link>
          </div>

          {/* System status */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="font-orbitron text-[9px] text-slate-700 tracking-[0.3em] uppercase">
              Guild Network Online
            </span>
          </div>
        </div>
      </div>
    </>
  )
}