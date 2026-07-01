import { useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'

export default function Navbar() {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  const navLinks = [
    { href: '/#how-it-works', label: 'How It Works' },
    { href: '/#ranks',        label: 'Ranks'        },
    { href: '/#quests',       label: 'Quests'       },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-purple-500/20">
      {/* Top scan line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 bg-purple-600/30 rotate-45 group-hover:bg-purple-500/50 transition-all duration-300" />
              <div className="absolute inset-1 bg-purple-500/20 rotate-45" />
              <span className="absolute inset-0 flex items-center justify-center text-purple-300 font-orbitron font-black text-xs">Q</span>
            </div>
            <div>
              <span className="font-orbitron font-black text-white text-sm tracking-widest">QUESTHUB</span>
              <span className="block text-purple-400 font-rajdhani text-xs tracking-[0.3em]">GUILD</span>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-slate-400 hover:text-purple-300 font-rajdhani font-semibold text-sm tracking-widest uppercase transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>


          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-purple-300 hover:text-white font-rajdhani font-semibold text-sm tracking-widest uppercase transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: typeof window !== 'undefined' ? window.location.origin + '/' : '/' })}
                  className="border border-purple-500/40 text-purple-300 hover:border-purple-400 hover:text-white px-4 py-1.5 font-orbitron text-xs tracking-widest uppercase transition-all duration-200"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-slate-400 hover:text-purple-300 font-rajdhani font-semibold text-sm tracking-widest uppercase transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="relative bg-purple-700/40 border border-purple-500/60 text-purple-200 hover:bg-purple-600/60 hover:text-white px-5 py-2 font-orbitron text-xs tracking-widest uppercase transition-all duration-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                >
                  <span className="absolute top-0 left-0 w-2 h-0.5 bg-purple-400" />
                  <span className="absolute bottom-0 right-0 w-2 h-0.5 bg-purple-400" />
                  Register
                </Link>
              </>
            )}
          </div>
          {session ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-purple-300 hover:text-white font-rajdhani font-semibold text-sm tracking-widest uppercase transition-colors"
              >
                <span className="w-1 h-1 bg-purple-400 rotate-45 flex-shrink-0" />
                Dashboard
              </Link>
              <button
                onClick={() => { signOut({ callbackUrl: typeof window !== 'undefined' ? window.location.origin + '/' : '/' }); setMenuOpen(false) }}
                className="flex items-center gap-3 px-3 py-3 text-slate-500 hover:text-red-400 font-rajdhani font-semibold text-sm tracking-widest uppercase transition-colors text-left w-full"
              >
                <span className="w-1 h-1 bg-slate-600 rotate-45 flex-shrink-0" />
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-slate-300 hover:text-purple-300 font-rajdhani font-semibold text-sm tracking-widest uppercase transition-colors"
              >
                <span className="w-1 h-1 bg-slate-600 rotate-45 flex-shrink-0" />
                Login
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 mt-1 bg-purple-700/30 border border-purple-500/40 text-purple-200 font-orbitron text-xs tracking-widest uppercase transition-all duration-200"
              >
                <span className="w-1 h-1 bg-purple-400 rotate-45 flex-shrink-0" />
                Register
              </Link>
            </>
          )}
          {/* Mobile menu toggle */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`w-6 h-0.5 bg-purple-400 transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`w-6 h-0.5 bg-purple-400 transition-all duration-300 ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
            <span className={`w-6 h-0.5 bg-purple-400 transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-black/98 border-t border-purple-500/20 px-4 py-6 flex flex-col gap-1">

          {/* Nav links */}
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 text-slate-400 hover:text-purple-300 font-rajdhani font-semibold text-sm tracking-widest uppercase transition-colors border border-transparent hover:border-purple-500/20"
            >
              <span className="w-1 h-1 bg-purple-500/50 rotate-45 flex-shrink-0" />
              {link.label}
            </Link>
          ))}

          {/* Divider */}
          <div className="my-3 h-px bg-purple-500/15" />

          {/* Auth links */}
          {session ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-purple-300 hover:text-white font-rajdhani font-semibold text-sm tracking-widest uppercase transition-colors"
              >
                <span className="w-1 h-1 bg-purple-400 rotate-45 flex-shrink-0" />
                Dashboard
              </Link>
              <button
                onClick={() => { signOut({ callbackUrl: typeof window !== 'undefined' ? window.location.origin + '/' : '/' }); setMenuOpen(false) }}
                className="flex items-center gap-3 px-3 py-3 text-slate-500 hover:text-red-400 font-rajdhani font-semibold text-sm tracking-widest uppercase transition-colors text-left w-full"
              >
                <span className="w-1 h-1 bg-slate-600 rotate-45 flex-shrink-0" />
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-slate-300 hover:text-purple-300 font-rajdhani font-semibold text-sm tracking-widest uppercase transition-colors border border-transparent hover:border-purple-500/20"
              >
                <span className="w-1 h-1 bg-slate-600 rotate-45 flex-shrink-0" />
                Login
              </Link>
              <Link
                href="/apply"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 mt-1 bg-purple-700/30 border border-purple-500/40 text-purple-200 hover:bg-purple-600/40 hover:text-white font-orbitron text-xs tracking-widest uppercase transition-all duration-200"
              >
                <span className="w-1 h-1 bg-purple-400 rotate-45 flex-shrink-0" />
                Apply Now →
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}